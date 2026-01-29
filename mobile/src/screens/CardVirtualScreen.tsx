import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Clipboard from 'expo-clipboard';
import { CreditCard, HelpCircle } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Components
import { Card, Button } from '../components/ui';
import { VirtualCard, CardActionGrid } from '../components/card';
import { TransactionList } from '../components/transaction';
import { Section } from '../components/layout';

// Utils
import { shadows } from '../utils/shadows';
import { useHaptics } from '../hooks/useHaptics';

// API
import {
  getCurrentUser,
  getUserWallet,
  getUserTransactions,
  generateCardDetails,
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

export default function CardVirtualScreen({ navigation }: CardVirtualScreenProps) {
  const { light, success, error: hapticError } = useHaptics();

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
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        console.error('CardVirtualScreen: No user found');
        setLoading(false);
        return;
      }
      setUser(currentUser);

      const userWallet = await getUserWallet(currentUser.id);
      const userTransactions = await getUserTransactions(currentUser.id, { limit: 5 });

      setWallet(userWallet);
      setTransactions(userTransactions.filter((tx) => tx.direction === 'outgoing'));

      // Générer les détails de carte
      if (userWallet) {
        const card = generateCardDetails(userWallet, currentUser);
        setCardDetails(card);
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
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
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

    light();

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authentifiez-vous pour voir le numéro',
        fallbackLabel: 'Utiliser le code PIN',
      });

      if (result.success) {
        success();
        setShowDetails(true);
        setCountdown(30);
      } else {
        hapticError();
      }
    } else {
      // Fallback si pas de biométrie
      setShowDetails(true);
      setCountdown(30);
    }
  };

  const handleCopyNumber = async () => {
    if (cardDetails) {
      light();
      await Clipboard.setStringAsync(cardDetails.number);
      Alert.alert('Copié', 'Numéro de carte copié dans le presse-papier.');
    }
  };

  const handleToggleLock = () => {
    light();
    Alert.alert(
      isLocked ? 'Déverrouiller ?' : 'Verrouiller la carte ?',
      isLocked
        ? 'Vous pourrez à nouveau effectuer des paiements.'
        : 'Tous les paiements seront refusés temporairement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: isLocked ? 'Déverrouiller' : 'Verrouiller',
          style: isLocked ? 'default' : 'destructive',
          onPress: () => {
            isLocked ? success() : hapticError();
            setIsLocked(!isLocked);
          },
        },
      ]
    );
  };

  const handleShowLimits = () => {
    light();
    Alert.alert(
      'Limites',
      `Plafond mensuel : 500 €\nSolde actuel : ${wallet?.balance.toFixed(2)} €`
    );
  };

  const handleShowPIN = () => {
    light();
    Alert.alert('Code PIN', 'Votre code PIN est confidentiel.');
  };

  const handleTransactionPress = (transaction: Transaction) => {
    light();
    navigation.navigate('TransactionDetail', { id: transaction.id });
  };

  // --- Loading State ---
  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-body text-ink-secondary mt-4">Chargement...</Text>
      </View>
    );
  }

  // --- No Card State ---
  if (!cardDetails || !wallet) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <CreditCard size={64} color="#86868B" />
        <Text className="text-body text-ink-secondary mt-4 text-center">
          Aucune carte disponible
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        {/* Header */}
        <View className="px-screen pt-4 pb-2">
          <Text className="text-largeTitle text-ink-primary">Carte virtuelle</Text>
          <Text className="text-subheadline text-ink-secondary mt-1">
            Paiements en ligne & mobile
          </Text>
        </View>

        {/* Virtual Card */}
        <View className="px-screen mt-4">
          <VirtualCard
            cardDetails={cardDetails}
            showDetails={showDetails}
            isLocked={isLocked}
            countdown={countdown}
            onLongPress={handleCopyNumber}
          />
        </View>

        {/* Action Grid */}
        <View className="px-screen mt-6">
          <CardActionGrid
            isLocked={isLocked}
            showDetails={showDetails}
            onToggleLock={handleToggleLock}
            onToggleDetails={handleAuthAndReveal}
            onShowLimits={handleShowLimits}
            onShowPIN={handleShowPIN}
          />
        </View>

        {/* Recent Payments */}
        <Section
          title="Derniers paiements"
          actionLabel="Voir tout"
          onActionPress={() => navigation.navigate('History')}
        >
          <Card variant="elevated" padding="none" className="overflow-hidden">
            <TransactionList
              transactions={transactions}
              onTransactionPress={handleTransactionPress}
              emptyMessage="Aucun paiement récent"
              showDividers
            />
          </Card>
        </Section>

        {/* Support Link */}
        <Pressable
          onPress={() => Alert.alert('Support', 'Contactez-nous à support@surphy.app')}
          className="flex-row justify-center items-center mt-6 mb-4 gap-2"
        >
          <HelpCircle size={18} color="#3B82F6" />
          <Text className="text-subheadline text-primary font-medium">
            Problème avec la carte ?
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
