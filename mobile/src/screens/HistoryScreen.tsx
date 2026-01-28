import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  FlatList
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  Filter,
  ShoppingBag,
  Coffee,
  CreditCard,
  Utensils,
  ChevronRight
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// --- Types ---

type RootStackParamList = {
  History: undefined;
  TransactionDetail: { id: string };
};

type HistoryScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'History'>;
};

type Transaction = {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  type: 'expense' | 'income';
  status: 'approved' | 'review' | 'blocked';
  category: string;
  icon: any;
  bg: string;
};

// --- Mock Data ---

const ALL_TRANSACTIONS: Transaction[] = [
  { id: '1', merchant: 'Carrefour Market', amount: 42.50, date: "25 Jan", type: 'expense', status: 'approved', category: 'courses', icon: ShoppingBag, bg: '#DBEAFE' },
  { id: '2', merchant: 'Uber Eats', amount: 18.90, date: '24 Jan', type: 'expense', status: 'approved', category: 'food', icon: Utensils, bg: '#FCE7F3' },
  { id: '3', merchant: 'Virement Maman', amount: 150.00, date: '22 Jan', type: 'income', status: 'approved', category: 'transfer', icon: CreditCard, bg: '#E0E7FF' },
  { id: '4', merchant: 'Snack Cafétéria', amount: 4.20, date: '20 Jan', type: 'expense', status: 'review', category: 'food', icon: Coffee, bg: '#FEF3C7' },
  { id: '5', merchant: 'Amazon', amount: 89.99, date: '18 Jan', type: 'expense', status: 'blocked', category: 'shopping', icon: ShoppingBag, bg: '#FEE2E2' },
  { id: '6', merchant: 'Netflix', amount: 13.49, date: '15 Jan', type: 'expense', status: 'approved', category: 'subscription', icon: CreditCard, bg: '#E0E7FF' },
  { id: '7', merchant: 'Starbucks', amount: 5.90, date: '14 Jan', type: 'expense', status: 'approved', category: 'food', icon: Coffee, bg: '#FCE7F3' },
  { id: '8', merchant: 'Virement Papa', amount: 200.00, date: '10 Jan', type: 'income', status: 'approved', category: 'transfer', icon: CreditCard, bg: '#E0E7FF' },
];

const FILTER_OPTIONS = [
  { id: 'all', label: 'Tout' },
  { id: 'approved', label: 'Validées' },
  { id: 'review', label: 'En revue' },
  { id: 'blocked', label: 'Bloquées' },
];

export default function HistoryScreen({ navigation }: HistoryScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('all');

  // --- Filtered Transactions ---
  const filteredTransactions = useMemo(() => {
    if (activeFilter === 'all') return ALL_TRANSACTIONS;
    return ALL_TRANSACTIONS.filter(tx => tx.status === activeFilter);
  }, [activeFilter]);

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
    const Icon = item.icon;
    const isLast = index === filteredTransactions.length - 1;

    const getStatusBadge = () => {
      switch (item.status) {
        case 'approved':
          return (
            <View className="bg-emerald-500 px-2 py-0.5 rounded-md">
              <Text className="text-white text-[10px] font-bold">VALIDÉE</Text>
            </View>
          );
        case 'review':
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
        <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: item.bg }}>
          <Icon size={20} color="#374151" />
        </View>

        {/* Info */}
        <View className="flex-1 gap-0.5">
          <Text className="text-gray-900 font-semibold text-[15px]">{item.merchant}</Text>
          <Text className="text-gray-400 text-[13px]">{item.date}</Text>
        </View>

        {/* Amount & Status */}
        <View className="items-end gap-1">
          <Text className={`font-bold text-[15px] ${item.type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>
            {item.type === 'income' ? '+' : '-'}{item.amount.toFixed(2)} €
          </Text>
          {getStatusBadge()}
        </View>
      </Pressable>
    );
  };

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
              <Text className="text-red-600 font-bold text-lg">-174,98 €</Text>
            </View>
            <View>
              <Text className="text-gray-400 text-xs">Revenus</Text>
              <Text className="text-green-600 font-bold text-lg">+350,00 €</Text>
            </View>
            <View>
              <Text className="text-gray-400 text-xs">Solde</Text>
              <Text className="text-blue-600 font-bold text-lg">+175,02 €</Text>
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
