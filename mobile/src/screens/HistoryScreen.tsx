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
import { Search, Filter } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Components
import { Card, Badge } from '../components/ui';
import { TransactionList } from '../components/transaction';

// Utils
import { shadows } from '../utils/shadows';
import { formatCurrency } from '../utils/formatters';
import { useHaptics } from '../hooks/useHaptics';

// API
import {
  getCurrentUser,
  getUserTransactions,
  getMonthlyStats,
} from '../lib/api';
import type { User, Transaction } from '../lib/types';

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

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        console.error('No user found');
        return;
      }
      setUser(currentUser);

      const [userTransactions, stats] = await Promise.all([
        getUserTransactions(currentUser.id),
        getMonthlyStats(currentUser.id),
      ]);

      setTransactions(userTransactions);
      setMonthlyStats(stats);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
