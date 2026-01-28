import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  StyleSheet,
  Platform,
  Image
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
  CreditCard
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// --- Types ---

type RootStackParamList = {
  Home: undefined;
  TransactionDetail: { id: string };
  Verification: { transactionId: string };
  Notifications: undefined;
  CardPayment: undefined; // Envoyer
  Receive: undefined;
};

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

// Mock Data pour l'exemple
const TRANSACTIONS = [
  { id: '1', merchant: 'Carrefour Market', amount: 42.50, date: "Aujourd'hui", type: 'expense', status: 'approved', icon: ShoppingBag, bg: '#DBEAFE' },
  { id: '2', merchant: 'Uber Eats', amount: 18.90, date: 'Hier', type: 'expense', status: 'approved', icon: Coffee, bg: '#FCE7F3' },
  { id: '3', merchant: 'Virement Maman', amount: 150.00, date: '22 Jan', type: 'income', status: 'approved', icon: CreditCard, bg: '#E0E7FF' },
  { id: '4', merchant: 'Snack Cafétéria', amount: 4.20, date: '20 Jan', type: 'expense', status: 'review', icon: Coffee, bg: '#FEF3C7' },
];

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState(1250.00);
  const [hasSuspiciousAlert, setHasSuspiciousAlert] = useState(true); // Simulé pour l'exemple

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulation API Call
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  // --- Render Components ---

  const renderHeader = () => (
    <View className="flex-row justify-between items-center px-5 py-4 bg-transparent">
      <View>
        <Text className="text-gray-500 text-sm font-medium">Bon retour,</Text>
        <Text className="text-gray-900 text-2xl font-bold">Grace</Text>
      </View>
      <Pressable
        onPress={() => navigation.navigate('Notifications')}
        className="w-10 h-10 bg-white rounded-full items-center justify-center border border-gray-200"
        style={styles.softShadow}
      >
        <Bell size={20} color="#6B7280" />
        {/* Badge Notification */}
        <View className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
      </Pressable>
    </View>
  );

  const renderBalanceCard = () => (
    <View style={[styles.cardShadow]} className="mx-5 bg-white rounded-2xl p-5 mb-6 border border-gray-100">
      <Text className="text-gray-400 text-[13px] font-normal mb-2">
        Solde disponible
      </Text>
      <Text className="text-gray-900 text-[36px] font-bold mb-6">
        {balance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
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
    if (!hasSuspiciousAlert) return null;

    return (
      <Pressable
        onPress={() => navigation.navigate('Verification', { transactionId: 'temp' })}
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

  const renderTransactionItem = (item: typeof TRANSACTIONS[0], index: number) => {
    const isLast = index === TRANSACTIONS.length - 1;
    const Icon = item.icon;

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
        <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: item.bg }}>
          <Icon size={20} color="#374151" />
        </View>

        {/* Info */}
        <View className="flex-1 gap-0.5">
          <Text className="text-gray-900 font-semibold text-[15px]">{item.merchant}</Text>
          <Text className="text-gray-400 text-[13px]">{item.date}</Text>
        </View>

        {/* Amount & Badge */}
        <View className="items-end gap-1">
          <Text className={`font-bold text-[15px] ${item.type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>
            {item.type === 'income' ? '+' : '-'}{item.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </Text>

          {item.status === 'review' ? (
            <View className="bg-amber-500 px-2 py-0.5 rounded-md">
              <Text className="text-white text-[10px] font-bold">À VÉRIFIER</Text>
            </View>
          ) : (
            <View className="bg-emerald-500 px-2 py-0.5 rounded-md">
              <Text className="text-white text-[10px] font-bold">VALIDÉE</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  // --- Main Render ---

  return (
    <View className="flex-1 bg-[#F3F4F6]">
      {/* Header fixé en haut pour le style (ou scrollable, au choix) */}
      <SafeAreaView edges={['top']} className="bg-[#F3F4F6] z-10">
        {renderHeader()}
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: 100 + insets.bottom, // Padding pour la TabBar
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

          {/* Container Liste "Card" style du Design System */}
          <View style={styles.sectionShadow} className="bg-white rounded-2xl overflow-hidden border border-gray-200">
            {TRANSACTIONS.map((t, index) => renderTransactionItem(t, index))}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// Styles précis issus du Design System (High Fidelity)
const styles = StyleSheet.create({
  // Ombre légère pour les cartes principales (Balance & Activity)
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
  // Ombre spécifique pour la section activité
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
  // Ombre douce pour les boutons ronds
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
  // Ombre du bouton primaire
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
