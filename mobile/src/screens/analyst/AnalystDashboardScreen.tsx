import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Bell, Search, ShieldAlert, HelpCircle, ChevronRight } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// Components
import { Card, RiskGauge, Input } from '../../components/ui';
import { AlertItem } from '../../components/analyst/AlertItem';
import { EmptyState } from '../../components/feedback';

// API
import { getAnalystStats, getFlaggedTransactions, type AnalystStats } from '../../lib/analystApi';
import type { Transaction } from '../../lib/types';

// Utils
import { shadows } from '../../utils/shadows';
import { useHaptics } from '../../hooks/useHaptics';
import { useAnalystNotifications } from '../../contexts/AnalystNotificationsContext';

// --- Types ---

type AnalystDashboardScreenProps = {
  navigation: any;
};

export default function AnalystDashboardScreen({ navigation }: AnalystDashboardScreenProps) {
  const { light } = useHaptics();
  const { unreadCount } = useAnalystNotifications();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<AnalystStats>({
    totalFlagged: 0,
    totalBlocked: 0,
    totalToday: 0,
    avgScore: 0,
  });
  const [flaggedTransactions, setFlaggedTransactions] = useState<Transaction[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [statsData, flaggedData] = await Promise.all([
        getAnalystStats(),
        getFlaggedTransactions(10),
      ]);
      setStats(statsData);
      setFlaggedTransactions(flaggedData);
    } catch (error) {
      console.error('Error fetching analyst dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-body text-ink-secondary mt-4">Chargement...</Text>
      </View>
    );
  }

  const ListHeader = () => (
    <>
      {/* Header */}
      <View className="px-screen pt-4 pb-2 flex-row justify-between items-center">
        <Text className="text-title1 text-ink-primary font-bold">Surphy</Text>
        <Pressable
          onPress={() => {
            light();
            navigation.navigate('AnalystNotifications');
          }}
          className="w-11 h-11 rounded-full bg-surface items-center justify-center border border-separator-opaque"
          style={shadows.soft}
        >
          <Bell size={22} color="#1D1D1F" />
          {unreadCount > 0 && (
            <View className="absolute -top-1 -right-1 min-w-5 h-5 bg-danger rounded-full items-center justify-center px-1">
              <Text className="text-white text-[10px] font-bold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Risk Gauge Card */}
      <Card variant="elevated" padding="lg" className="mx-screen mb-6 items-center">
        <RiskGauge
          score={stats.avgScore}
          size={240}
          subtitle={`${stats.totalFlagged} transactions signalées • Aujourd'hui`}
        />

        {/* Stats row */}
        <View className="flex-row mt-4 w-full">
          <View className="flex-1 items-center">
            <Text className="text-title2 font-bold text-warning">{stats.totalFlagged}</Text>
            <Text className="text-caption1 text-ink-secondary">Signalées</Text>
          </View>
          <View className="w-px bg-separator-opaque" />
          <View className="flex-1 items-center">
            <Text className="text-title2 font-bold text-danger">{stats.totalBlocked}</Text>
            <Text className="text-caption1 text-ink-secondary">Bloquées</Text>
          </View>
          <View className="w-px bg-separator-opaque" />
          <View className="flex-1 items-center">
            <Text className="text-title2 font-bold text-primary">{stats.totalToday}</Text>
            <Text className="text-caption1 text-ink-secondary">Aujourd'hui</Text>
          </View>
        </View>
      </Card>

      {/* Search */}
      <View className="px-screen mb-4">
        <Input
          placeholder="Rechercher une transaction..."
          leftIcon={Search}
        />
      </View>

      {/* Section Title */}
      <View className="px-screen flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <ShieldAlert size={20} color="#FF9500" />
          <Text className="text-title2 text-ink-primary">Transactions suspectes</Text>
        </View>
      </View>
    </>
  );

  const ListFooter = () => (
    <>
      {/* See more link */}
      {flaggedTransactions.length > 0 && (
        <Pressable
          onPress={() => {
            light();
            navigation.navigate('AnalystAlerts');
          }}
          className="flex-row items-center justify-center py-4 gap-1"
        >
          <Text className="text-subheadline text-primary font-semibold">
            Voir plus de paiements
          </Text>
          <ChevronRight size={16} color="#3B82F6" />
        </Pressable>
      )}

      {/* Support link */}
      <Pressable
        onPress={() => {
          light();
          navigation.navigate('SupportChat');
        }}
        className="flex-row justify-center items-center mt-4 mb-8 gap-2"
      >
        <HelpCircle size={18} color="#3B82F6" />
        <Text className="text-subheadline text-primary font-medium">
          Besoin d'aide ? Contacter le support
        </Text>
      </Pressable>
    </>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlatList
        data={flaggedTransactions}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={
          <EmptyState
            icon={ShieldAlert}
            title="Aucune alerte"
            message="Aucune transaction suspecte détectée pour le moment."
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
