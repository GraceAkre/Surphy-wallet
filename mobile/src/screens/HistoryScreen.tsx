import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  Filter,
  ShoppingBag,
  Coffee,
  CreditCard,
  Send,
  Banknote
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// API
import {
  getCurrentUser,
  getUserTransactions,
  getMonthlyStats
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

// Helper pour obtenir l'icône selon le type de transaction
const getTransactionIcon = (tx: Transaction) => {
  if (tx.transaction_type === 'transfer') return Send;
  if (tx.transaction_type === 'deposit') return Banknote;
  if (tx.merchant_id?.includes('cafet') || tx.merchant_id?.includes('snack')) return Coffee;
  if (tx.merchant_id?.includes('shop') || tx.merchant_id?.includes('store')) return ShoppingBag;
  return CreditCard;
};

// Helper pour obtenir la couleur de fond selon le type
const getTransactionBg = (tx: Transaction) => {
  if (tx.status === 'blocked') return '#FEE2E2';
  if (tx.direction === 'incoming') return '#E0E7FF';
  if (tx.transaction_type === 'transfer') return '#FCE7F3';
  if (tx.merchant_id?.includes('cafet')) return '#FEF3C7';
  return '#DBEAFE';
};

// Helper pour formater la date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

// Helper pour obtenir le nom du merchant lisible
const getMerchantName = (tx: Transaction) => {
  if (!tx.merchant_id) return 'Transaction';

  const merchantNames: Record<string, string> = {
    'cafet_paris': 'Cafétéria Paris',
    'cafet_marseille': 'Cafétéria Marseille',
    'cafet_toulouse': 'Cafétéria Toulouse',
    'luxury_store_ru': 'Luxury Store (Moscow)',
    'night_shop': 'Night Shop',
    'shop_paris': 'Shop Paris',
    'p2p_transfer': 'Transfert P2P',
    'stripe': 'Dépôt Stripe',
    'electronics_msl': 'Electronics Marseille',
  };

  return merchantNames[tx.merchant_id] || tx.merchant_id;
};

export default function HistoryScreen({ navigation }: HistoryScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('all');
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

  // --- Filtered Transactions ---
  const filteredTransactions = useMemo(() => {
    if (activeFilter === 'all') return transactions;
    return transactions.filter(tx => tx.status === activeFilter);
  }, [activeFilter, transactions]);

  // --- Components ---

  const FilterChip = ({ id, label, isActive, onPress }: { id: string; label: string; isActive: boolean; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      className={`px-4 py-2 rounded-full mr-2 ${isActive ? 'bg-blue-500' : 'bg-white border border-gray-200'}`}
      style={isActive ? styles.activeChipShadow : undefined}
    >
      <Text className={`font-semibold text-sm ${isActive ? 'text-white' : 'text-gray-600'}`}>
        {label}
      </Text>
    </Pressable>
  );

  const TransactionItem = ({ item, index }: { item: Transaction; index: number }) => {
    const Icon = getTransactionIcon(item);
    const isLast = index === filteredTransactions.length - 1;
    const bgColor = getTransactionBg(item);

    const getStatusBadge = () => {
      switch (item.status) {
        case 'approved':
          return (
            <View className="bg-emerald-500 px-2 py-0.5 rounded-md">
              <Text className="text-white text-[10px] font-bold">VALIDÉE</Text>
            </View>
          );
        case 'flagged':
          return (
            <View className="bg-amber-500 px-2 py-0.5 rounded-md">
              <Text className="text-white text-[10px] font-bold">EN REVUE</Text>
            </View>
          );
        case 'blocked':
          return (
            <View className="bg-red-500 px-2 py-0.5 rounded-md">
              <Text className="text-white text-[10px] font-bold">BLOQUÉE</Text>
            </View>
          );
        default:
          return (
            <View className="bg-gray-400 px-2 py-0.5 rounded-md">
              <Text className="text-white text-[10px] font-bold">EN ATTENTE</Text>
            </View>
          );
      }
    };

    return (
      <Pressable
        onPress={() => navigation.navigate('TransactionDetail', { id: item.id })}
        style={({ pressed }) => [
          { backgroundColor: pressed ? '#F9FAFB' : 'white' }
        ]}
        className={`flex-row items-center px-4 py-3.5 ${!isLast ? 'border-b border-gray-100' : ''}`}
      >
        {/* Icon */}
        <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: bgColor }}>
          <Icon size={20} color="#374151" />
        </View>

        {/* Info */}
        <View className="flex-1 gap-0.5">
          <Text className="text-gray-900 font-semibold text-[15px]">{getMerchantName(item)}</Text>
          <Text className="text-gray-400 text-[13px]">{formatDate(item.created_at)}</Text>
        </View>

        {/* Amount & Status */}
        <View className="items-end gap-1">
          <Text className={`font-bold text-[15px] ${item.direction === 'incoming' ? 'text-green-600' : 'text-gray-900'}`}>
            {item.direction === 'incoming' ? '+' : '-'}{item.amount.toFixed(2)} €
          </Text>
          {getStatusBadge()}
        </View>
      </Pressable>
    );
  };

  // --- Loading State ---
  if (loading) {
    return (
      <View className="flex-1 bg-[#F3F4F6] items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-500 mt-4">Chargement...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F3F4F6]">
      {/* Header */}
      <SafeAreaView edges={['top']} className="bg-[#F3F4F6]">
        <View className="px-5 pt-4 pb-2">
          <Text className="text-[36px] font-bold text-gray-900 leading-tight">
            Historique
          </Text>
          <Text className="text-[15px] text-gray-500 mt-1">
            Toutes vos transactions
          </Text>
        </View>

        {/* Search Bar (Placeholder) */}
        <Pressable
          className="mx-5 mt-4 mb-4 bg-white rounded-xl px-4 py-3 flex-row items-center border border-gray-200"
          style={styles.softShadow}
        >
          <Search size={20} color="#9CA3AF" />
          <Text className="text-gray-400 ml-3 flex-1">Rechercher une transaction...</Text>
          <Filter size={20} color="#6B7280" />
        </Pressable>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
        >
          {FILTER_OPTIONS.map(option => (
            <FilterChip
              key={option.id}
              id={option.id}
              label={option.label}
              isActive={activeFilter === option.id}
              onPress={() => setActiveFilter(option.id)}
            />
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* Transaction List */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardShadow} className="mx-5 bg-white rounded-2xl overflow-hidden border border-gray-200">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((tx, index) => (
              <TransactionItem key={tx.id} item={tx} index={index} />
            ))
          ) : (
            <View className="p-8 items-center">
              <Text className="text-gray-400 text-base">Aucune transaction trouvée</Text>
            </View>
          )}
        </View>

        {/* Summary */}
        <View className="mx-5 mt-4 p-4 bg-white rounded-xl border border-gray-200">
          <Text className="text-gray-500 text-sm mb-2">Résumé du mois</Text>
          <View className="flex-row justify-between">
            <View>
              <Text className="text-gray-400 text-xs">Dépenses</Text>
              <Text className="text-red-600 font-bold text-lg">
                -{monthlyStats.expenses.toFixed(2)} €
              </Text>
            </View>
            <View>
              <Text className="text-gray-400 text-xs">Revenus</Text>
              <Text className="text-green-600 font-bold text-lg">
                +{monthlyStats.income.toFixed(2)} €
              </Text>
            </View>
            <View>
              <Text className="text-gray-400 text-xs">Solde</Text>
              <Text className={`font-bold text-lg ${monthlyStats.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {monthlyStats.balance >= 0 ? '+' : ''}{monthlyStats.balance.toFixed(2)} €
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  softShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  activeChipShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});
