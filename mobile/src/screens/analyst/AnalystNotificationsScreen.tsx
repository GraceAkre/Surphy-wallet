import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Bell } from 'lucide-react-native';

import { AlertItem } from '../../components/analyst/AlertItem';
import { EmptyState } from '../../components/feedback';
import { useAnalystNotifications } from '../../contexts/AnalystNotificationsContext';
import { getFlaggedTransactions } from '../../lib/analystApi';
import type { Transaction } from '../../lib/types';
import { useHaptics } from '../../hooks/useHaptics';

type AnalystNotificationsScreenProps = {
  navigation: any;
};

export default function AnalystNotificationsScreen({ navigation }: AnalystNotificationsScreenProps) {
  const { light } = useHaptics();
  const { newTransactions, markAllRead } = useAnalystNotifications();

  const [history, setHistory] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    const data = await getFlaggedTransactions(50);
    setHistory(data);
  }, []);

  // Mark all read when screen is focused + load history
  useFocusEffect(
    useCallback(() => {
      markAllRead();
      fetchHistory();
    }, [markAllRead, fetchHistory])
  );

  // Merge realtime + history, deduplicate by id, sort by created_at desc
  const mergedTransactions = useMemo(() => {
    const map = new Map<string, Transaction>();
    for (const tx of newTransactions) {
      map.set(tx.id, tx);
    }
    for (const tx of history) {
      if (!map.has(tx.id)) {
        map.set(tx.id, tx);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [newTransactions, history]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  }, [fetchHistory]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-screen pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => {
            light();
            navigation.goBack();
          }}
          className="w-10 h-10 rounded-full bg-surface items-center justify-center border border-separator-opaque"
        >
          <ArrowLeft size={20} color="#1D1D1F" />
        </Pressable>
        <Text className="text-title2 text-ink-primary font-bold flex-1">Notifications</Text>
      </View>

      {/* List */}
      <FlatList
        data={mergedTransactions}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            icon={Bell}
            title="Aucune notification"
            message="Les nouvelles transactions apparaitront ici en temps reel."
          />
        }
        renderItem={({ item }) => (
          <View className="px-screen">
            <AlertItem
              transaction={item}
              onPress={() => {
                light();
                navigation.navigate('AlertDetail', { transactionId: item.id });
              }}
            />
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
          />
        }
      />
    </SafeAreaView>
  );
}
