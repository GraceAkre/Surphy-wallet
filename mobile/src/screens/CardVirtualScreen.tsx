import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Clipboard from 'expo-clipboard';
import { CreditCard, HelpCircle, X, Minus, Plus } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Components
import { Card, Button } from '../components/ui';
import { VirtualCard, CardActionGrid } from '../components/card';
import { TransactionList } from '../components/transaction';
import { Section } from '../components/layout';

// Utils
import { shadows } from '../utils/shadows';
import { formatCurrency } from '../utils/formatters';
import { useHaptics } from '../hooks/useHaptics';

// API
import {
  getCurrentUser,
  getUserWallet,
  getUserTransactions,
  generateCardDetails,
  toggleWalletLock,
} from '../lib/api';
import type { User, Wallet, Transaction, CardDetails } from '../lib/types';

// --- Types ---

type RootStackParamList = {
  History: undefined;
  CardVirtual: undefined;
  TransactionDetail: { id: string };
  SupportChat: { initialNodeId?: string } | undefined;
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

  // Limits
  const [limitsModalVisible, setLimitsModalVisible] = useState(false);
  const [monthlyLimit, setMonthlyLimit] = useState(500);
  const [dailyLimit, setDailyLimit] = useState(150);

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

      // Générer les détails de carte + init lock state
      if (userWallet) {
        const card = generateCardDetails(userWallet, currentUser);
        setCardDetails(card);
        setIsLocked(userWallet.status === 'frozen');
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
          onPress: async () => {
            if (!wallet) return;
            const newLocked = !isLocked;
            const result = await toggleWalletLock(wallet.id, newLocked);
            if (result.success) {
              newLocked ? hapticError() : success();
              setIsLocked(newLocked);
            } else {
              hapticError();
              Alert.alert('Erreur', result.errorMessage || 'Impossible de modifier le statut de la carte.');
            }
          },
        },
      ]
    );
  };

  const handleShowLimits = () => {
    light();
    setLimitsModalVisible(true);
  };

  const adjustLimit = (type: 'monthly' | 'daily', delta: number) => {
    light();
    if (type === 'monthly') {
      setMonthlyLimit((prev) => Math.max(100, Math.min(5000, prev + delta)));
    } else {
      setDailyLimit((prev) => Math.max(50, Math.min(1000, prev + delta)));
    }
  };

  const handleShowPIN = async () => {
    light();

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authentifiez-vous pour voir le code PIN',
        fallbackLabel: 'Annuler',
      });

      if (!result.success) {
        hapticError();
        return;
      }
    }

    // Générer un PIN 4 chiffres déterministe à partir du wallet ID
    if (wallet) {
      const raw = wallet.id.replace(/-/g, '');
      const pin = String(
        ((raw.charCodeAt(4) % 10) * 1000) +
        ((raw.charCodeAt(7) % 10) * 100) +
        ((raw.charCodeAt(10) % 10) * 10) +
        (raw.charCodeAt(13) % 10)
      ).padStart(4, '0');

      success();
      Alert.alert('Code PIN', `Votre code PIN est :\n\n${pin}\n\nNe le partagez avec personne.`);
    }
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
            onShowPin={handleShowPIN}
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
          onPress={() => navigation.navigate('SupportChat', { initialNodeId: 'card_type_select' })}
          className="flex-row justify-center items-center mt-6 mb-4 gap-2"
        >
          <HelpCircle size={18} color="#3B82F6" />
          <Text className="text-subheadline text-primary font-medium">
            Problème avec la carte ?
          </Text>
        </Pressable>
      </ScrollView>

      {/* Limits Modal */}
      <Modal
        visible={limitsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLimitsModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-background">
          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-screen py-4 border-b border-separator-opaque/50">
            <Text className="text-title2 text-ink-primary font-semibold">
              Limites de carte
            </Text>
            <Pressable
              onPress={() => setLimitsModalVisible(false)}
              className="w-8 h-8 items-center justify-center rounded-full bg-gray-100"
            >
              <X size={18} color="#6E6E73" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Current Balance */}
            <View className="px-screen mt-6 mb-6">
              <Card variant="elevated" padding="lg">
                <Text className="text-footnote text-ink-tertiary mb-1">Solde actuel</Text>
                <Text className="text-title1 text-ink-primary font-bold">
                  {formatCurrency(wallet?.balance || 0)}
                </Text>
              </Card>
            </View>

            {/* Monthly Limit */}
            <View className="px-screen mb-6">
              <Text className="text-headline text-ink-primary mb-3">Plafond mensuel</Text>
              <Card variant="elevated" padding="lg">
                <Text className="text-largeTitle text-primary font-bold text-center mb-4">
                  {formatCurrency(monthlyLimit)}
                </Text>

                {/* Progress bar */}
                <View className="h-2.5 bg-gray-100 rounded-full mb-2 overflow-hidden">
                  <View
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.min(100, ((wallet?.balance || 0) / monthlyLimit) * 100)}%` }}
                  />
                </View>
                <Text className="text-caption1 text-ink-tertiary mb-4">
                  {formatCurrency(wallet?.balance || 0)} utilisé sur {formatCurrency(monthlyLimit)}
                </Text>

                {/* Stepper */}
                <View className="flex-row items-center justify-center gap-4">
                  <Pressable
                    onPress={() => adjustLimit('monthly', -100)}
                    disabled={monthlyLimit <= 100}
                    style={({ pressed }) => [
                      { opacity: monthlyLimit <= 100 ? 0.3 : pressed ? 0.7 : 1 },
                    ]}
                    className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center"
                  >
                    <Minus size={20} color="#1D1D1F" />
                  </Pressable>

                  <View className="flex-row flex-wrap gap-2">
                    {[200, 500, 1000, 2000].map((value) => (
                      <Pressable
                        key={value}
                        onPress={() => { light(); setMonthlyLimit(value); }}
                        style={({ pressed }) => [
                          { transform: [{ scale: pressed ? 0.95 : 1 }] },
                        ]}
                        className={`px-3.5 py-2 rounded-full border ${
                          monthlyLimit === value
                            ? 'bg-primary border-primary'
                            : 'bg-surface border-separator-opaque'
                        }`}
                      >
                        <Text className={`text-caption1 font-semibold ${
                          monthlyLimit === value ? 'text-white' : 'text-ink-primary'
                        }`}>
                          {value} €
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Pressable
                    onPress={() => adjustLimit('monthly', 100)}
                    disabled={monthlyLimit >= 5000}
                    style={({ pressed }) => [
                      { opacity: monthlyLimit >= 5000 ? 0.3 : pressed ? 0.7 : 1 },
                    ]}
                    className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center"
                  >
                    <Plus size={20} color="#1D1D1F" />
                  </Pressable>
                </View>
              </Card>
            </View>

            {/* Daily Limit */}
            <View className="px-screen mb-6">
              <Text className="text-headline text-ink-primary mb-3">Plafond journalier</Text>
              <Card variant="elevated" padding="lg">
                <Text className="text-largeTitle text-primary font-bold text-center mb-4">
                  {formatCurrency(dailyLimit)}
                </Text>

                {/* Stepper */}
                <View className="flex-row items-center justify-center gap-4">
                  <Pressable
                    onPress={() => adjustLimit('daily', -50)}
                    disabled={dailyLimit <= 50}
                    style={({ pressed }) => [
                      { opacity: dailyLimit <= 50 ? 0.3 : pressed ? 0.7 : 1 },
                    ]}
                    className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center"
                  >
                    <Minus size={20} color="#1D1D1F" />
                  </Pressable>

                  <View className="flex-row flex-wrap gap-2">
                    {[50, 150, 300, 500].map((value) => (
                      <Pressable
                        key={value}
                        onPress={() => { light(); setDailyLimit(value); }}
                        style={({ pressed }) => [
                          { transform: [{ scale: pressed ? 0.95 : 1 }] },
                        ]}
                        className={`px-3.5 py-2 rounded-full border ${
                          dailyLimit === value
                            ? 'bg-primary border-primary'
                            : 'bg-surface border-separator-opaque'
                        }`}
                      >
                        <Text className={`text-caption1 font-semibold ${
                          dailyLimit === value ? 'text-white' : 'text-ink-primary'
                        }`}>
                          {value} €
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Pressable
                    onPress={() => adjustLimit('daily', 50)}
                    disabled={dailyLimit >= 1000}
                    style={({ pressed }) => [
                      { opacity: dailyLimit >= 1000 ? 0.3 : pressed ? 0.7 : 1 },
                    ]}
                    className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center"
                  >
                    <Plus size={20} color="#1D1D1F" />
                  </Pressable>
                </View>
              </Card>
            </View>

            {/* Save Button */}
            <View className="px-screen">
              <Pressable
                onPress={() => {
                  success();
                  setLimitsModalVisible(false);
                  Alert.alert('Limites mises à jour', `Plafond mensuel : ${formatCurrency(monthlyLimit)}\nPlafond journalier : ${formatCurrency(dailyLimit)}`);
                }}
                style={({ pressed }) => [
                  shadows.primaryButton,
                  { transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
                className="bg-primary rounded-button py-4 items-center"
              >
                <Text className="text-headline text-white">Enregistrer</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
