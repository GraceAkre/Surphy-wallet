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
import { Bell, Search, ShieldAlert, ChevronRight } from 'lucide-react-native';
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
      // Tri : review/flagged/blocked en premier, approved en dernier
      const sorted = [...flaggedData].sort((a, b) => {
        const priority = (tx: Transaction) => {
          if (tx.decision === 'review' || tx.status === 'flagged') return 0;
          if (tx.decision === 'block' || tx.status === 'blocked') return 1;
          return 2;
        };
        return priority(a) - priority(b);
      });
      setFlaggedTransactions(sorted);
    } catch (error) {
      console.error('Error fetching analyst dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();

      // Polling toutes les 30s quand l'écran est visible
      const interval = setInterval(fetchData, 30_000);
      return () => clearInterval(interval);
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
      <View className="px-screen pt-3 pb-2 flex-row justify-between items-center">
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
      <Card variant="elevated" padding="md" className="mx-screen mb-4 items-center">
        <RiskGauge
          score={stats.avgScore}
          size={200}
        />

        <Text className="text-caption2 text-ink-tertiary mt-4 mb-0">
          Score moyen ML du jour
        </Text>

        {/* Stats row */}
        <View className="flex-row w-full">
          <Pressable
            className="flex-1 items-center"
            onPress={() => {
              light();
              navigation.navigate('AnalystAlerts', { initialDecision: 'review' });
            }}
          >
            <Text className="text-title3 font-bold text-warning">{stats.totalFlagged}</Text>
            <Text className="text-caption2 text-ink-secondary mt-0.5">File d'attente</Text>
          </Pressable>
          <View className="w-px bg-separator-opaque/50" />
          <Pressable
            className="flex-1 items-center"
            onPress={() => {
              light();
              navigation.navigate('AnalystAlerts', { initialDecision: 'block' });
            }}
          >
            <Text className="text-title3 font-bold text-danger">{stats.totalBlocked}</Text>
            <Text className="text-caption2 text-ink-secondary mt-0.5">Urgentes</Text>
          </Pressable>
          <View className="w-px bg-separator-opaque/50" />
          <Pressable
            className="flex-1 items-center"
            onPress={() => {
              light();
              navigation.navigate('AnalystAlerts', { initialDecision: 'approve', initialPeriod: 'today' });
            }}
          >
            <Text className="text-title3 font-bold text-primary">{stats.totalToday}</Text>
            <Text className="text-caption2 text-ink-secondary mt-0.5">Traitées aujourd'hui</Text>
          </Pressable>
        </View>
      </Card>

      {/* Search */}
      <View className="px-screen mb-3">
        <Input
          placeholder="Rechercher une transaction..."
          leftIcon={Search}
          size="sm"
        />
      </View>

      {/* Section Title */}
      <View className="px-screen flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <ShieldAlert size={18} color="#FF9500" />
          <Text className="text-headline text-ink-primary">Transactions suspectes</Text>
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
