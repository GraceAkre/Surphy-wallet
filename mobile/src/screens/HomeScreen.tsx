import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Components
import { Card, IconButton } from '../components/ui';
import { Section } from '../components/layout';
import { TransactionList } from '../components/transaction';
import { AlertBanner } from '../components/feedback';

// Utils
import { shadows } from '../utils/shadows';
import { formatCurrency, getInitials } from '../utils/formatters';
import { useHaptics } from '../hooks/useHaptics';

// API
import {
  getCurrentUser,
  getUserWallet,
  getUserTransactions,
  hasSuspiciousTransactions,
  getFirstSuspiciousTransaction,
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

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const { light } = useHaptics();

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

  const handleTransactionPress = (transaction: Transaction) => {
    light();
    navigation.navigate('TransactionDetail', { id: transaction.id });
  };

  const handleAlertPress = () => {
    if (suspiciousTransaction) {
      light();
      navigation.navigate('Verification', { transactionId: suspiciousTransaction.id });
    }
  };

  // --- Render Header ---
  const renderHeader = () => (
    <View className="flex-row justify-between items-center px-screen py-4">
      <View>
        <Text className="text-subheadline text-ink-secondary font-medium">
          Bon retour,
        </Text>
        <Text className="text-title1 text-ink-primary">
          {user?.full_name?.split(' ')[0] || 'Utilisateur'}
        </Text>
      </View>

      <View className="relative">
        <IconButton
          icon={Bell}
          variant="outlined"
          onPress={() => navigation.navigate('Notifications')}
        />
        {hasSuspiciousAlert && (
          <View className="absolute top-1 right-1 w-2.5 h-2.5 bg-danger rounded-full border-2 border-white" />
        )}
      </View>
    </View>
  );

  // --- Render Balance Card ---
  const renderBalanceCard = () => (
    <Card variant="elevated" padding="lg" className="mx-screen mb-6">
      <Text className="text-footnote text-ink-tertiary mb-2">
        Solde disponible
      </Text>
      <Text className="text-largeTitle text-ink-primary mb-6">
        {formatCurrency(wallet?.balance || 0)}
      </Text>

      {/* Quick Actions */}
      <View className="flex-row gap-3">
        <Pressable
          onPress={() => {
            light();
            navigation.navigate('CardPayment');
          }}
          style={({ pressed }) => [
            shadows.primaryButton,
            { flex: 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
          className="bg-primary rounded-button py-3.5 flex-row justify-center items-center"
        >
          <ArrowUpRight size={18} color="white" style={{ marginRight: 8 }} />
          <Text className="text-headline text-white">Envoyer</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            light();
            navigation.navigate('Receive');
          }}
          style={({ pressed }) => [
            shadows.soft,
            { flex: 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
          className="bg-surface border border-separator-opaque rounded-button py-3.5 flex-row justify-center items-center"
        >
          <ArrowDownLeft size={18} color="#3B82F6" style={{ marginRight: 8 }} />
          <Text className="text-headline text-primary">Recevoir</Text>
        </Pressable>
      </View>
    </Card>
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

  // --- Main Render ---
  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={['top']} className="bg-background z-10">
        {renderHeader()}
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: 100 + insets.bottom,
          paddingTop: 10,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
            colors={['#3B82F6']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Card */}
        {renderBalanceCard()}

        {/* Alert Banner */}
        {hasSuspiciousAlert && suspiciousTransaction && (
          <View className="px-screen mb-6">
            <AlertBanner
              variant="warning"
              title="Alerte de sécurité"
              message="Transaction suspecte détectée"
              onPress={handleAlertPress}
            />
          </View>
        )}

        {/* Recent Transactions */}
        <View className="px-screen">
          <Section
            title="Activités récentes"
            onAction={() => console.log('Voir tout')}
          >
            <TransactionList
              transactions={transactions}
              onTransactionPress={handleTransactionPress}
              maxItems={5}
              emptyMessage="Aucune transaction récente"
            />
          </Section>
        </View>
      </ScrollView>
    </View>
  );
}
