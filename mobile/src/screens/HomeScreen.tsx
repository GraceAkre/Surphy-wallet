import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  ChevronRight,
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
  getUserWallet,
  getUserTransactions,
  hasSuspiciousTransactions,
  getFirstSuspiciousTransaction
} from '../lib/api';
import type { User, Wallet, Transaction } from '../lib/types';

// --- Types ---

type RootStackParamList = {
  Home: undefined;
  TransactionDetail: { id: string };
  Verification: { transactionId: string };
  Notifications: undefined;
  CardPayment: undefined;
  Receive: undefined;
};

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

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
  if (tx.direction === 'incoming') return '#E0E7FF';
  if (tx.transaction_type === 'transfer') return '#FCE7F3';
  if (tx.merchant_id?.includes('cafet')) return '#FEF3C7';
  return '#DBEAFE';
};

// Helper pour formater la date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

// Helper pour obtenir le nom du merchant lisible
const getMerchantName = (tx: Transaction) => {
  if (!tx.merchant_id) return 'Transaction';

  // Mapper les merchant_id vers des noms lisibles
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

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data from Supabase
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hasSuspiciousAlert, setHasSuspiciousAlert] = useState(false);
  const [suspiciousTransaction, setSuspiciousTransaction] = useState<Transaction | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        console.error('No user found');
        return;
      }
      setUser(currentUser);

      const [userWallet, userTransactions, hasSuspicious, firstSuspicious] = await Promise.all([
        getUserWallet(currentUser.id),
        getUserTransactions(currentUser.id, { limit: 5 }),
        hasSuspiciousTransactions(currentUser.id),
        getFirstSuspiciousTransaction(currentUser.id),
      ]);

      setWallet(userWallet);
      setTransactions(userTransactions);
      setHasSuspiciousAlert(hasSuspicious);
      setSuspiciousTransaction(firstSuspicious);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // --- Render Components ---

  const renderHeader = () => (
    <View className="flex-row justify-between items-center px-5 py-4 bg-transparent">
      <View>
        <Text className="text-gray-500 text-sm font-medium">Bon retour,</Text>
        <Text className="text-gray-900 text-2xl font-bold">
          {user?.full_name?.split(' ')[0] || 'Utilisateur'}
        </Text>
      </View>
      <Pressable
        onPress={() => navigation.navigate('Notifications')}
        className="w-10 h-10 bg-white rounded-full items-center justify-center border border-gray-200"
        style={styles.softShadow}
      >
        <Bell size={20} color="#6B7280" />
        {hasSuspiciousAlert && (
          <View className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
        )}
      </Pressable>
    </View>
  );

  const renderBalanceCard = () => (
    <View style={[styles.cardShadow]} className="mx-5 bg-white rounded-2xl p-5 mb-6 border border-gray-100">
      <Text className="text-gray-400 text-[13px] font-normal mb-2">
        Solde disponible
      </Text>
      <Text className="text-gray-900 text-[36px] font-bold mb-6">
        {(wallet?.balance || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
      </Text>

      {/* Actions Rapides */}
      <View className="flex-row gap-3">
        <Pressable
          onPress={() => navigation.navigate('CardPayment')}
          style={({ pressed }) => [
            { flex: 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            styles.buttonShadow
          ]}
          className="bg-blue-500 rounded-xl py-3.5 flex-row justify-center items-center"
        >
          <ArrowUpRight size={18} color="white" style={{ marginRight: 8 }} />
          <Text className="text-white font-semibold text-sm">Envoyer</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('Receive')}
          style={({ pressed }) => [
            { flex: 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
          ]}
          className="bg-white border border-gray-200 rounded-xl py-3.5 flex-row justify-center items-center"
        >
          <ArrowDownLeft size={18} color="#3B82F6" style={{ marginRight: 8 }} />
          <Text className="text-blue-500 font-semibold text-sm">Recevoir</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderAlertBanner = () => {
    if (!hasSuspiciousAlert || !suspiciousTransaction) return null;

    return (
      <Pressable
        onPress={() => navigation.navigate('Verification', { transactionId: suspiciousTransaction.id })}
        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
        className="mx-5 mb-6 bg-yellow-50 border border-yellow-100 p-4 rounded-2xl flex-row items-center"
      >
        <View className="w-10 h-10 bg-yellow-100 rounded-full items-center justify-center mr-3">
          <AlertTriangle size={20} color="#F59E0B" fill="#F59E0B" fillOpacity={0.2} />
        </View>
        <View className="flex-1">
          <Text className="text-gray-900 font-semibold text-[15px]">Alerte de sécurité</Text>
          <Text className="text-gray-500 text-xs">Transaction suspecte détectée</Text>
        </View>
        <ChevronRight size={20} color="#9CA3AF" />
      </Pressable>
    );
  };

  const renderTransactionItem = (item: Transaction, index: number) => {
    const isLast = index === transactions.length - 1;
    const Icon = getTransactionIcon(item);
    const bgColor = getTransactionBg(item);

    // Map status to display status
    const getStatusBadge = () => {
      if (item.decision === 'review' || item.status === 'flagged') {
        return (
          <View className="bg-amber-500 px-2 py-0.5 rounded-md">
            <Text className="text-white text-[10px] font-bold">À VÉRIFIER</Text>
          </View>
        );
      }
      if (item.status === 'blocked') {
        return (
          <View className="bg-red-500 px-2 py-0.5 rounded-md">
            <Text className="text-white text-[10px] font-bold">BLOQUÉE</Text>
          </View>
        );
      }
      return (
        <View className="bg-emerald-500 px-2 py-0.5 rounded-md">
          <Text className="text-white text-[10px] font-bold">VALIDÉE</Text>
        </View>
      );
    };

    return (
      <Pressable
        key={item.id}
        onPress={() => navigation.navigate('TransactionDetail', { id: item.id })}
        style={({ pressed }) => [
          { backgroundColor: pressed ? '#F9FAFB' : 'white' }
        ]}
        className={`flex-row items-center px-4 py-3.5 ${!isLast ? 'border-b border-gray-100' : ''}`}
      >
        {/* Avatar / Icon */}
        <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: bgColor }}>
          <Icon size={20} color="#374151" />
        </View>

        {/* Info */}
        <View className="flex-1 gap-0.5">
          <Text className="text-gray-900 font-semibold text-[15px]">{getMerchantName(item)}</Text>
          <Text className="text-gray-400 text-[13px]">{formatDate(item.created_at)}</Text>
        </View>

        {/* Amount & Badge */}
        <View className="items-end gap-1">
          <Text className={`font-bold text-[15px] ${item.direction === 'incoming' ? 'text-green-600' : 'text-gray-900'}`}>
            {item.direction === 'incoming' ? '+' : '-'}{item.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
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

  // --- Main Render ---

  return (
    <View className="flex-1 bg-[#F3F4F6]">
      <SafeAreaView edges={['top']} className="bg-[#F3F4F6] z-10">
        {renderHeader()}
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: 100 + insets.bottom,
          paddingTop: 10
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderBalanceCard()}

        {renderAlertBanner()}

        {/* Section Activité */}
        <View className="mx-5 mb-4">
          <View className="flex-row justify-between items-center mb-3 px-1">
            <Text className="text-gray-500 text-lg font-semibold">Activités récentes</Text>
            <Pressable>
              <Text className="text-blue-500 text-sm font-medium">Voir tout</Text>
            </Pressable>
          </View>

          <View style={styles.sectionShadow} className="bg-white rounded-2xl overflow-hidden border border-gray-200">
            {transactions.length > 0 ? (
              transactions.map((t, index) => renderTransactionItem(t, index))
            ) : (
              <View className="p-8 items-center">
                <Text className="text-gray-400 text-base">Aucune transaction</Text>
              </View>
            )}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  cardShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
        shadowColor: '#000000',
      },
    }),
  },
  sectionShadow: {
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
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  buttonShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
        shadowColor: '#3B82F6',
      },
    }),
  }
});
