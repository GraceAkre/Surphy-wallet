import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  TrendingUp,
  Clock,
  BarChart3,
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../../components/ui';
import { shadows } from '../../utils/shadows';
import { supabase } from '../../lib/supabase';

type WeeklyRecapScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

interface WeeklyStats {
  totalTransactions: number;
  totalFlagged: number;
  totalBlocked: number;
  totalApproved: number;
  avgScore: number;
  highestScore: number;
  reviewRate: number;
}

export default function WeeklyRecapScreen({ navigation }: WeeklyRecapScreenProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<WeeklyStats>({
    totalTransactions: 0,
    totalFlagged: 0,
    totalBlocked: 0,
    totalApproved: 0,
    avgScore: 0,
    highestScore: 0,
    reviewRate: 0,
  });

  const fetchWeeklyStats = useCallback(async () => {
    try {
      // Début de la semaine courante (lundi 00h00)
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=dim, 1=lun, ...
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - mondayOffset);
      weekStart.setHours(0, 0, 0, 0);

      // Si on est lundi avant les premières transactions, montrer la semaine précédente
      const weekAgo = weekStart;

      const { data, error } = await supabase
        .from('transactions')
        .select('score_ml, decision, status')
        .gte('created_at', weekAgo.toISOString());

      if (error || !data) {
        console.error('Error fetching weekly stats:', error);
        return;
      }

      const total = data.length;
      const flagged = data.filter(
        (tx) => tx.decision === 'review' || tx.status === 'flagged'
      ).length;
      const blocked = data.filter(
        (tx) => tx.decision === 'block' || tx.status === 'blocked'
      ).length;
      const approved = data.filter(
        (tx) => tx.decision === 'approve' || tx.status === 'approved'
      ).length;

      const scored = data.filter((tx) => tx.score_ml !== null);
      const avgScore =
        scored.length > 0
          ? Math.round(
              scored.reduce((sum, tx) => sum + (tx.score_ml ?? 0), 0) / scored.length
            )
          : 0;
      const highestScore =
        scored.length > 0
          ? Math.max(...scored.map((tx) => tx.score_ml ?? 0))
          : 0;

      const reviewRate = total > 0 ? Math.round(((flagged + blocked) / total) * 100) : 0;

      setStats({
        totalTransactions: total,
        totalFlagged: flagged,
        totalBlocked: blocked,
        totalApproved: approved,
        avgScore,
        highestScore: Math.round(highestScore),
        reviewRate,
      });
    } catch (err) {
      console.error('Error fetching weekly recap:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeeklyStats();
  }, [fetchWeeklyStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWeeklyStats();
    setRefreshing(false);
  }, [fetchWeeklyStats]);

  const StatCard = ({
    icon: Icon,
    iconColor,
    iconBg,
    label,
    value,
    suffix,
  }: {
    icon: any;
    iconColor: string;
    iconBg: string;
    label: string;
    value: number;
    suffix?: string;
  }) => (
    <Card variant="elevated" padding="md" className="flex-1">
      <View className={`w-9 h-9 rounded-full items-center justify-center mb-2 ${iconBg}`}>
        <Icon size={18} color={iconColor} />
      </View>
      <Text className="text-title2 font-bold text-ink-primary">
        {value}{suffix}
      </Text>
      <Text className="text-caption2 text-ink-secondary mt-0.5">{label}</Text>
    </Card>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-body text-ink-secondary mt-4">Chargement...</Text>
      </View>
    );
  }

  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStartDisplay = new Date(now);
  weekStartDisplay.setDate(now.getDate() - mondayOffset);
  const sundayDisplay = new Date(weekStartDisplay);
  sundayDisplay.setDate(weekStartDisplay.getDate() + 6);
  const formatShortDate = (d: Date) =>
    d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => navigation.goBack()}
          className="w-11 h-11 rounded-full bg-surface items-center justify-center border border-separator-opaque"
          style={shadows.soft}
        >
          <ChevronLeft size={24} color="#1D1D1F" />
        </Pressable>
        <View>
          <Text className="text-title2 text-ink-primary">Récapitulatif hebdo</Text>
          <Text className="text-caption1 text-ink-tertiary">
            {formatShortDate(weekStartDisplay)} — {formatShortDate(sundayDisplay)}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        {/* Score moyen */}
        <Card variant="elevated" padding="lg" className="mb-4 items-center">
          <Text className="text-caption1 text-ink-tertiary mb-2">Score moyen ML</Text>
          <Text
            className="text-[48px] font-extrabold"
            style={{
              color:
                stats.avgScore < 33
                  ? '#34C759'
                  : stats.avgScore < 66
                  ? '#FF9500'
                  : '#FF3B30',
            }}
          >
            {stats.avgScore}
          </Text>
          <Text className="text-caption2 text-ink-tertiary mt-1">sur 100</Text>
        </Card>

        {/* KPIs grid */}
        <View className="flex-row gap-3 mb-3">
          <StatCard
            icon={BarChart3}
            iconColor="#3B82F6"
            iconBg="bg-primary-50"
            label="Total transactions"
            value={stats.totalTransactions}
          />
          <StatCard
            icon={TrendingUp}
            iconColor="#FF3B30"
            iconBg="bg-danger/10"
            label="Score max"
            value={stats.highestScore}
          />
        </View>

        <View className="flex-row gap-3 mb-3">
          <StatCard
            icon={ShieldAlert}
            iconColor="#FF9500"
            iconBg="bg-warning/10"
            label="Signalées"
            value={stats.totalFlagged}
          />
          <StatCard
            icon={ShieldX}
            iconColor="#FF3B30"
            iconBg="bg-danger/10"
            label="Bloquées"
            value={stats.totalBlocked}
          />
        </View>

        <View className="flex-row gap-3 mb-4">
          <StatCard
            icon={ShieldCheck}
            iconColor="#34C759"
            iconBg="bg-success/10"
            label="Approuvées"
            value={stats.totalApproved}
          />
          <StatCard
            icon={Clock}
            iconColor="#FF9500"
            iconBg="bg-warning/10"
            label="Taux d'alerte"
            value={stats.reviewRate}
            suffix="%"
          />
        </View>

        {/* Résumé */}
        <Card variant="elevated" padding="lg">
          <Text className="text-headline text-ink-primary mb-3">Résumé</Text>
          <View className="gap-3">
            <View className="flex-row items-start gap-2">
              <Text className="text-footnote text-primary mt-0.5">•</Text>
              <Text className="text-footnote text-ink-secondary flex-1 leading-5">
                {stats.totalTransactions} transactions analysées cette semaine,
                dont {stats.totalFlagged + stats.totalBlocked} ont nécessité une attention particulière.
              </Text>
            </View>
            <View className="flex-row items-start gap-2">
              <Text className="text-footnote text-primary mt-0.5">•</Text>
              <Text className="text-footnote text-ink-secondary flex-1 leading-5">
                Le score moyen de risque est de {stats.avgScore}/100
                {stats.avgScore < 33
                  ? ', ce qui indique un niveau de risque faible.'
                  : stats.avgScore < 66
                  ? ', ce qui indique un niveau de risque modéré.'
                  : ', ce qui indique un niveau de risque élevé.'}
              </Text>
            </View>
            <View className="flex-row items-start gap-2">
              <Text className="text-footnote text-primary mt-0.5">•</Text>
              <Text className="text-footnote text-ink-secondary flex-1 leading-5">
                {stats.reviewRate}% des transactions ont déclenché une alerte
                (signalée ou bloquée).
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
