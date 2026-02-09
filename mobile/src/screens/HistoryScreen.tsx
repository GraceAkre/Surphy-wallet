import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Filter, XCircle } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

// Components
import { Card, Badge } from '../components/ui';
import { TransactionList } from '../components/transaction';

// Utils
import { shadows } from '../utils/shadows';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useHaptics } from '../hooks/useHaptics';

// API
import {
  getCurrentUser,
  getUserTransactions,
  getMonthlyStats,
  getMoneyRequestsForUser,
} from '../lib/api';
import type { User, Transaction, MoneyRequest } from '../lib/types';

// --- Types ---

type RootStackParamList = {
  History: undefined;
  TransactionDetail: { id: string };
};

type HistoryScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'History'>;
};

const FILTER_OPTIONS = [
  { id: 'all', label: 'Tout' },
  { id: 'approved', label: 'Validées' },
  { id: 'flagged', label: 'En revue' },
  { id: 'blocked', label: 'Bloquées' },
];

export default function HistoryScreen({ navigation }: HistoryScreenProps) {
  const insets = useSafeAreaInsets();
  const { light, selection } = useHaptics();

  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Data from Supabase
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyStats, setMonthlyStats] = useState({ expenses: 0, income: 0, balance: 0 });
  const [declinedRequests, setDeclinedRequests] = useState<MoneyRequest[]>([]);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        console.error('No user found');
        return;
      }
      setUser(currentUser);

      const [userTransactions, stats, declinedReqs] = await Promise.all([
        getUserTransactions(currentUser.id),
        getMonthlyStats(currentUser.id),
        getMoneyRequestsForUser(currentUser.id, 'declined'),
      ]);

      setTransactions(userTransactions);
      setMonthlyStats(stats);
      setDeclinedRequests(declinedReqs);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    let result = transactions;

    // Filter by status
    if (activeFilter !== 'all') {
      result = result.filter((tx) => tx.status === activeFilter);
    }

    // Filter by search (merchant name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.merchant_id?.toLowerCase().includes(query) ||
          tx.transaction_type?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [activeFilter, searchQuery, transactions]);

  const handleFilterPress = (filterId: string) => {
    selection();
    setActiveFilter(filterId);
  };

  const handleTransactionPress = (transaction: Transaction) => {
    light();
    navigation.navigate('TransactionDetail', { id: transaction.id });
  };

  // --- Filter Chip Component ---
  const FilterChip = ({
    id,
    label,
    isActive,
  }: {
    id: string;
    label: string;
    isActive: boolean;
  }) => (
    <Pressable
      onPress={() => handleFilterPress(id)}
      style={isActive ? shadows.primaryButton : undefined}
      className={`
        px-4 py-2 rounded-chip mr-2
        ${isActive ? 'bg-primary' : 'bg-surface border border-separator-opaque'}
      `}
    >
      <Text
        className={`text-subheadline font-semibold ${
          isActive ? 'text-white' : 'text-ink-secondary'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );

  // --- Loading State ---
  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-body text-ink-secondary mt-4">Chargement...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <SafeAreaView edges={['top']} className="bg-background">
        <View className="px-screen pt-4 pb-2">
          <Text className="text-largeTitle text-ink-primary">
            Historique
          </Text>
          <Text className="text-subheadline text-ink-secondary mt-1">
            Toutes vos transactions
          </Text>
        </View>

        {/* Search Bar */}
        <View className="px-screen mt-4 mb-4">
          <View
            className="flex-row items-center bg-surface rounded-input px-4 py-3 border border-separator-opaque"
            style={shadows.soft}
          >
            <Search size={20} color="#86868B" />
            <TextInput
              className="flex-1 ml-3 text-body text-ink-primary"
              placeholder="Rechercher une transaction..."
              placeholderTextColor="#86868B"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <Filter size={20} color="#6E6E73" />
          </View>
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
        >
          {FILTER_OPTIONS.map((option) => (
            <FilterChip
              key={option.id}
              id={option.id}
              label={option.label}
              isActive={activeFilter === option.id}
            />
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* Transaction List */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-screen">
          <TransactionList
            transactions={filteredTransactions}
            onTransactionPress={handleTransactionPress}
            emptyMessage="Aucune transaction trouvée"
          />
        </View>

        {/* Declined Money Requests */}
        {activeFilter === 'all' && declinedRequests.length > 0 && (
          <View className="px-screen mt-4">
            <Text className="text-subheadline text-ink-secondary mb-3 ml-1">
              Demandes refusées
            </Text>
            <View
              className="bg-surface rounded-2xl border border-separator-opaque/50 overflow-hidden"
              style={shadows.card}
            >
              {declinedRequests.map((req, index) => (
                <View
                  key={req.id}
                  className={`flex-row items-center px-4 py-3.5 ${
                    index < declinedRequests.length - 1 ? 'border-b border-separator-opaque/50' : ''
                  }`}
                >
                  <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: '#FEE2E2' }}>
                    <XCircle size={20} color="#EF4444" />
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text className="text-subheadline font-semibold text-ink-primary">
                      Demande refusée
                    </Text>
                    <Text className="text-footnote text-ink-tertiary">
                      {req.requester_name} — {formatDate(req.updated_at)}
                    </Text>
                  </View>
                  <View className="items-end gap-1">
                    <Text className="text-subheadline font-bold text-ink-tertiary">
                      {formatCurrency(req.amount)}
                    </Text>
                    <View className="bg-red-100 rounded-full px-2 py-0.5">
                      <Text className="text-caption2 font-semibold" style={{ color: '#EF4444', fontSize: 10 }}>REFUSÉE</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Monthly Summary */}
        <Card variant="outlined" padding="md" className="mx-screen mt-4">
          <Text className="text-subheadline text-ink-secondary mb-3">
            Résumé du mois
          </Text>
          <View className="flex-row justify-between">
            <View>
              <Text className="text-footnote text-ink-tertiary">Dépenses</Text>
              <Text className="text-headline text-danger font-bold">
                -{formatCurrency(monthlyStats.expenses)}
              </Text>
            </View>
            <View>
              <Text className="text-footnote text-ink-tertiary">Revenus</Text>
              <Text className="text-headline text-success font-bold">
                +{formatCurrency(monthlyStats.income)}
              </Text>
            </View>
            <View>
              <Text className="text-footnote text-ink-tertiary">Solde</Text>
              <Text
                className={`text-headline font-bold ${
                  monthlyStats.balance >= 0 ? 'text-primary' : 'text-danger'
                }`}
              >
                {monthlyStats.balance >= 0 ? '+' : ''}
                {formatCurrency(monthlyStats.balance)}
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
