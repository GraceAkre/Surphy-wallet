import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldAlert,
  CreditCard,
  Banknote,
  Bell,
  XCircle,
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Utils
import { formatCurrency, formatDate } from '../utils/formatters';
import { getMerchantName } from '../utils/transactionHelpers';

// API
import { getCurrentUser, getUserTransactions, getMoneyRequestsForUser } from '../lib/api';
import type { Transaction, MoneyRequest } from '../lib/types';

// --- Types ---

type RootStackParamList = {
  Notifications: undefined;
  TransactionDetail: { id: string };
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Notifications'>;
};

function getNotificationInfo(tx: Transaction) {
  const merchant = getMerchantName(tx);
  const amount = formatCurrency(tx.amount, { showSign: false });

  if (tx.status === 'blocked') {
    return {
      icon: ShieldAlert,
      iconColor: '#EF4444',
      iconBg: '#FEE2E2',
      title: 'Transaction bloquée',
      body: `${merchant} — ${amount} a été bloquée par notre système de sécurité.`,
    };
  }

  if (tx.decision === 'review' || tx.status === 'flagged') {
    return {
      icon: ShieldAlert,
      iconColor: '#F59E0B',
      iconBg: '#FEF3C7',
      title: 'Transaction suspecte',
      body: `${merchant} — ${amount} nécessite une vérification.`,
    };
  }

  if (tx.direction === 'incoming' && tx.transaction_type === 'transfer') {
    return {
      icon: ArrowDownLeft,
      iconColor: '#22C55E',
      iconBg: '#DCFCE7',
      title: 'Virement reçu',
      body: `Vous avez reçu ${amount} via un virement.`,
    };
  }

  if (tx.direction === 'outgoing' && tx.transaction_type === 'transfer') {
    return {
      icon: ArrowUpRight,
      iconColor: '#3B82F6',
      iconBg: '#DBEAFE',
      title: 'Virement envoyé',
      body: `Vous avez envoyé ${amount} par virement.`,
    };
  }

  if (tx.transaction_type === 'deposit') {
    return {
      icon: Banknote,
      iconColor: '#22C55E',
      iconBg: '#DCFCE7',
      title: 'Dépôt reçu',
      body: `${amount} a été crédité sur votre compte.`,
    };
  }

  if (tx.direction === 'outgoing') {
    return {
      icon: CreditCard,
      iconColor: '#6E6E73',
      iconBg: '#F3F4F6',
      title: 'Paiement effectué',
      body: `${amount} chez ${merchant}.`,
    };
  }

  return {
    icon: CreditCard,
    iconColor: '#6E6E73',
    iconBg: '#F3F4F6',
    title: 'Transaction',
    body: `${merchant} — ${amount}.`,
  };
}

type NotificationItem =
  | { type: 'transaction'; data: Transaction; created_at: string }
  | { type: 'money_request'; data: MoneyRequest; created_at: string }
  | { type: 'money_request_declined'; data: MoneyRequest; created_at: string };

export default function NotificationsScreen({ navigation }: Props) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const user = await getCurrentUser();
    if (!user) return;
    const [txs, pendingReqs, declinedReqs] = await Promise.all([
      getUserTransactions(user.id, { limit: 30 }),
      getMoneyRequestsForUser(user.id),
      getMoneyRequestsForUser(user.id, 'declined'),
    ]);

    const txItems: NotificationItem[] = txs.map((tx) => ({
      type: 'transaction' as const,
      data: tx,
      created_at: tx.created_at,
    }));
    const pendingItems: NotificationItem[] = pendingReqs.map((req) => ({
      type: 'money_request' as const,
      data: req,
      created_at: req.created_at,
    }));
    const declinedItems: NotificationItem[] = declinedReqs.map((req) => ({
      type: 'money_request_declined' as const,
      data: req,
      created_at: req.updated_at,
    }));

    const merged = [...txItems, ...pendingItems, ...declinedItems].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setItems(merged);
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const renderItem = ({ item, index }: { item: NotificationItem; index: number }) => {
    if (item.type === 'money_request_declined') {
      const req = item.data as MoneyRequest;
      return (
        <View
          className={`flex-row items-start px-5 py-4 bg-white ${
            index < items.length - 1 ? 'border-b border-separator-opaque/50' : ''
          }`}
        >
          <View
            className="w-11 h-11 rounded-full items-center justify-center mr-3 mt-0.5"
            style={{ backgroundColor: '#FEE2E2' }}
          >
            <XCircle size={20} color="#EF4444" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-0.5">
              <Text className="text-subheadline font-semibold text-ink-primary flex-1" numberOfLines={1}>
                Demande refusée
              </Text>
              <Text className="text-caption1 text-ink-tertiary ml-2">
                {formatDate(req.updated_at)}
              </Text>
            </View>
            <Text className="text-footnote text-ink-secondary leading-5" numberOfLines={2}>
              Demande de {formatCurrency(req.amount, { showSign: false })} de {req.requester_name || 'quelqu\'un'} refusée.
            </Text>
          </View>
        </View>
      );
    }

    if (item.type === 'money_request') {
      const req = item.data as MoneyRequest;
      return (
        <View
          className={`flex-row items-start px-5 py-4 bg-white ${
            index < items.length - 1 ? 'border-b border-separator-opaque/50' : ''
          }`}
        >
          <View
            className="w-11 h-11 rounded-full items-center justify-center mr-3 mt-0.5"
            style={{ backgroundColor: '#DBEAFE' }}
          >
            <ArrowDownLeft size={20} color="#3B82F6" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-0.5">
              <Text className="text-subheadline font-semibold text-ink-primary flex-1" numberOfLines={1}>
                Demande de virement
              </Text>
              <Text className="text-caption1 text-ink-tertiary ml-2">
                {formatDate(req.created_at)}
              </Text>
            </View>
            <Text className="text-footnote text-ink-secondary leading-5" numberOfLines={2}>
              {req.requester_name || 'Quelqu\'un'} vous demande {formatCurrency(req.amount, { showSign: false })}.
            </Text>
          </View>
        </View>
      );
    }

    const tx = item.data as Transaction;
    const info = getNotificationInfo(tx);
    const Icon = info.icon;

    return (
      <Pressable
        onPress={() => navigation.navigate('TransactionDetail', { id: tx.id })}
        style={({ pressed }) => [{ backgroundColor: pressed ? '#F9FAFB' : '#FFFFFF' }]}
        className={`flex-row items-start px-5 py-4 ${
          index < items.length - 1 ? 'border-b border-separator-opaque/50' : ''
        }`}
      >
        <View
          className="w-11 h-11 rounded-full items-center justify-center mr-3 mt-0.5"
          style={{ backgroundColor: info.iconBg }}
        >
          <Icon size={20} color={info.iconColor} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-0.5">
            <Text className="text-subheadline font-semibold text-ink-primary flex-1" numberOfLines={1}>
              {info.title}
            </Text>
            <Text className="text-caption1 text-ink-tertiary ml-2">
              {formatDate(tx.created_at)}
            </Text>
          </View>
          <Text className="text-footnote text-ink-secondary leading-5" numberOfLines={2}>
            {info.body}
          </Text>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-screen pt-2 pb-4 flex-row items-center">
        <Pressable onPress={() => navigation.goBack()} className="w-11 h-11 justify-center">
          <ChevronLeft color="#1D1D1F" size={28} />
        </Pressable>
        <Text className="text-title1 text-ink-primary ml-1">
          Notifications
        </Text>
      </View>

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 bg-fill-tertiary rounded-full items-center justify-center mb-4">
            <Bell size={28} color="#86868B" />
          </View>
          <Text className="text-body text-ink-secondary text-center">
            Aucune notification pour le moment
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) =>
            item.type === 'transaction'
              ? `tx-${(item.data as Transaction).id}`
              : `req-${item.type}-${(item.data as MoneyRequest).id}`
          }
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
              colors={['#3B82F6']}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </SafeAreaView>
  );
}
