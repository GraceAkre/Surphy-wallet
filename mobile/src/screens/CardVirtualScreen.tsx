import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Clipboard from 'expo-clipboard';
import {
  Lock,
  Eye,
  EyeOff,
  BarChart2,
  Key,
  Copy,
  Wifi,
  ShoppingBag,
  Coffee,
  CreditCard,
  Send,
  Banknote,
  HelpCircle
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// API
import {
  getCurrentUser,
  getUserWallet,
  getUserTransactions,
  generateCardDetails
} from '../lib/api';
import type { User, Wallet, Transaction, CardDetails } from '../lib/types';

// --- Types ---

type RootStackParamList = {
  History: undefined;
  CardVirtual: undefined;
  TransactionDetail: { id: string };
};

type CardVirtualScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CardVirtual'>;
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

  const merchantNames: Record<string, string> = {
    'cafet_paris': 'Cafétéria Paris',
    'cafet_marseille': 'Cafétéria Marseille',
    'cafet_toulouse': 'Cafétéria Toulouse',
    'luxury_store_ru': 'Luxury Store',
    'night_shop': 'Night Shop',
    'shop_paris': 'Shop Paris',
    'p2p_transfer': 'Transfert P2P',
    'stripe': 'Dépôt Stripe',
    'electronics_msl': 'Electronics',
    'carrefour': 'Carrefour Market',
    'starbucks': 'Starbucks',
  };

  return merchantNames[tx.merchant_id] || tx.merchant_id;
};

export default function CardVirtualScreen({ navigation }: CardVirtualScreenProps) {
  // --- State ---
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Data from Supabase
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [cardDetails, setCardDetails] = useState<CardDetails | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // --- Fetch Data ---
  const fetchData = useCallback(async () => {
    try {
      console.log('CardVirtualScreen: Fetching current user...');
      const currentUser = await getCurrentUser();
      console.log('CardVirtualScreen: Current user:', currentUser);

      if (!currentUser) {
        console.error('CardVirtualScreen: No user found');
        setLoading(false);
        return;
      }
      setUser(currentUser);

      console.log('CardVirtualScreen: Fetching wallet for user:', currentUser.id);
      const userWallet = await getUserWallet(currentUser.id);
      console.log('CardVirtualScreen: User wallet:', userWallet);

      const userTransactions = await getUserTransactions(currentUser.id, { limit: 5 });
      console.log('CardVirtualScreen: User transactions:', userTransactions.length);

      setWallet(userWallet);
      setTransactions(userTransactions.filter(tx => tx.direction === 'outgoing'));

      // Générer les détails de carte
      if (userWallet) {
        const card = generateCardDetails(userWallet, currentUser);
        console.log('CardVirtualScreen: Generated card details:', card);
        setCardDetails(card);
      } else {
        console.error('CardVirtualScreen: No wallet found, cannot generate card');
      }
    } catch (error) {
      console.error('CardVirtualScreen: Error fetching data:', error);
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

  // --- Effects (Auto-hide details) ---
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showDetails && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (countdown === 0) {
      setShowDetails(false);
    }
    return () => clearTimeout(timer);
  }, [showDetails, countdown]);

  // --- Handlers ---

  const handleAuthAndReveal = async () => {
    if (showDetails) {
      setShowDetails(false);
      return;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authentifiez-vous pour voir le numéro',
        fallbackLabel: 'Utiliser le code PIN',
      });

      if (result.success) {
        setShowDetails(true);
        setCountdown(30);
      }
    } else {
      // Fallback si pas de biométrie
      setShowDetails(true);
      setCountdown(30);
    }
  };

  const handleCopyNumber = async () => {
    if (cardDetails) {
      await Clipboard.setStringAsync(cardDetails.number);
      Alert.alert("Copié", "Numéro de carte copié dans le presse-papier.");
    }
  };

  const handleToggleLock = () => {
    Alert.alert(
      isLocked ? "Déverrouiller ?" : "Verrouiller la carte ?",
      isLocked
        ? "Vous pourrez à nouveau effectuer des paiements."
        : "Tous les paiements seront refusés temporairement.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: isLocked ? "Déverrouiller" : "Verrouiller",
          style: isLocked ? "default" : "destructive",
          onPress: () => setIsLocked(!isLocked)
        }
      ]
    );
  };

  // --- Components Internes ---

  const ActionButton = ({ icon: Icon, label, onPress, isDanger = false }: any) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.softShadow,
        {
          transform: [{ scale: pressed ? 0.98 : 1 }],
          backgroundColor: isDanger && isLocked ? '#FEF2F2' : 'white',
          borderColor: isDanger && isLocked ? '#EF4444' : '#E5E7EB'
        }
      ]}
      className="flex-1 min-w-[45%] p-4 rounded-xl border border-gray-200 items-center justify-center gap-2 mb-3"
    >
      <Icon size={24} color={isDanger ? '#DC2626' : '#374151'} />
      <Text className={`font-medium ${isDanger ? 'text-red-600' : 'text-gray-900'}`}>{label}</Text>
    </Pressable>
  );

  // --- Loading State ---
  if (loading) {
    return (
      <View className="flex-1 bg-[#F3F4F6] items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-500 mt-4">Chargement...</Text>
      </View>
    );
  }

  // --- No Card State ---
  if (!cardDetails || !wallet) {
    return (
      <View className="flex-1 bg-[#F3F4F6] items-center justify-center px-6">
        <CreditCard size={64} color="#9CA3AF" />
        <Text className="text-gray-500 mt-4 text-center">Aucune carte disponible</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F3F4F6]">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >

        {/* 1. Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-[40px] font-bold text-gray-900 leading-tight">Carte virtuelle</Text>
          <Text className="text-[16px] text-gray-500">Paiements en ligne & mobile</Text>
        </View>

        {/* 2. Virtual Card */}
        <Pressable
          onLongPress={handleCopyNumber}
          className="mx-5 mt-6 mb-6"
          style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }]}
        >
          <LinearGradient
            colors={isLocked ? ['#9CA3AF', '#4B5563'] : ['#5B8FD8', '#7BB5F5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.cardShadow, { borderRadius: 20, padding: 24, minHeight: 220 }]}
          >
            {/* Top Row */}
            <View className="flex-row justify-between items-start mb-8">
              <Text className="text-white font-bold text-lg tracking-wider">SURPHY</Text>
              <Wifi size={24} color="rgba(255,255,255,0.8)" style={{ transform: [{ rotate: '90deg' }] }} />
            </View>

            {/* Chip */}
            <View className="w-12 h-9 bg-yellow-400/80 rounded-md mb-6" />

            {/* Number */}
            <View className="flex-row items-center justify-between">
              <Text className="text-white text-[22px] font-medium tracking-[2px] font-mono">
                {showDetails ? cardDetails.number : cardDetails.maskedNumber}
              </Text>
              {!showDetails && <Copy size={16} color="rgba(255,255,255,0.6)" />}
            </View>

            {/* Bottom Info */}
            <View className="flex-row justify-between items-end mt-auto pt-8">
              <View>
                <Text className="text-white/70 text-[10px] uppercase mb-1">Titulaire</Text>
                <Text className="text-white font-medium text-sm">{cardDetails.holder}</Text>
              </View>
              <View>
                <Text className="text-white/70 text-[10px] uppercase mb-1">Expire</Text>
                <Text className="text-white font-medium text-sm">{cardDetails.expiry}</Text>
              </View>
              <View>
                <Text className="text-white/70 text-[10px] uppercase mb-1">CVV</Text>
                <Text className="text-white font-medium text-sm">{showDetails ? cardDetails.cvv : '***'}</Text>
              </View>
            </View>

            {/* Locked Overlay */}
            {isLocked && (
              <View className="absolute inset-0 items-center justify-center bg-black/10 rounded-[20px]">
                <View className="bg-white/20 p-4 rounded-full backdrop-blur-sm">
                  <Lock size={32} color="white" />
                </View>
                <Text className="text-white font-bold mt-2 text-lg">VERROUILLÉE</Text>
              </View>
            )}

            {/* Countdown Timer */}
            {showDetails && (
              <View className="absolute top-4 right-4 bg-black/20 px-2 py-1 rounded-md">
                <Text className="text-white text-xs font-mono">{countdown}s</Text>
              </View>
            )}
          </LinearGradient>
        </Pressable>

        {/* 3. Action Grid */}
        <View className="flex-row flex-wrap justify-between px-5 mb-6">
          <ActionButton
            icon={Lock}
            label={isLocked ? "Déverrouiller" : "Verrouiller"}
            onPress={handleToggleLock}
            isDanger
          />
          <ActionButton
            icon={showDetails ? EyeOff : Eye}
            label={showDetails ? "Masquer" : "Voir détails"}
            onPress={handleAuthAndReveal}
          />
          <ActionButton
            icon={BarChart2}
            label="Limites"
            onPress={() => Alert.alert("Limites", `Plafond mensuel : 500 €\nSolde actuel : ${wallet.balance.toFixed(2)} €`)}
          />
          <ActionButton
            icon={Key}
            label="Code PIN"
            onPress={() => Alert.alert("Code PIN", "Votre code PIN est confidentiel.")}
          />
        </View>

        {/* 4. Recent Payments */}
        <View className="px-5">
          <Text className="text-[20px] font-semibold text-gray-900 mb-3">Derniers paiements</Text>

          <View style={styles.cardShadow} className="bg-white rounded-2xl overflow-hidden border border-gray-200 mb-4">
            {transactions.length > 0 ? (
              transactions.map((tx, index) => {
                const Icon = getTransactionIcon(tx);
                const bgColor = getTransactionBg(tx);
                return (
                  <Pressable
                    key={tx.id}
                    onPress={() => navigation.navigate('TransactionDetail', { id: tx.id })}
                    className={`flex-row items-center px-4 py-3.5 ${index !== transactions.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: bgColor }}>
                      <Icon size={18} color="#374151" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[15px] font-semibold text-gray-900">{getMerchantName(tx)}</Text>
                      <Text className="text-[13px] text-gray-400">{formatDate(tx.created_at)}</Text>
                    </View>
                    <Text className="text-[15px] font-semibold text-gray-900">
                      -{tx.amount.toFixed(2)} €
                    </Text>
                  </Pressable>
                );
              })
            ) : (
              <View className="p-8 items-center">
                <Text className="text-gray-400 text-base">Aucun paiement récent</Text>
              </View>
            )}
          </View>

          <Pressable
            onPress={() => navigation.navigate('History')}
            className="w-full py-4 border border-gray-200 rounded-xl items-center bg-white"
          >
            <Text className="text-blue-500 font-semibold">Voir tout l'historique</Text>
          </Pressable>

          <Pressable className="flex-row justify-center items-center mt-6 mb-4 gap-2">
            <HelpCircle size={18} color="#3B82F6" />
            <Text className="text-blue-500 font-medium text-[15px]">Problème avec la carte ?</Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  cardShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
        shadowColor: '#3B82F6',
      },
    }),
  },
  softShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  }
});
