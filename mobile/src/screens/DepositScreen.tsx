import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CreditCard, Lock, Wallet, Building2 } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Components
import { Card } from '../components/ui';

// Utils
import { shadows } from '../utils/shadows';
import { formatCurrency, formatAmountInput } from '../utils/formatters';
import { useHaptics } from '../hooks/useHaptics';

// API
import { getCurrentUser, getUserWallet, depositFunds, getCampusWallets, adminDepositToCampus } from '../lib/api';
import type { User } from '../lib/types';

// --- Types ---

type RootStackParamList = {
  Home: undefined;
  Deposit: undefined;
  DepositSuccess: { amount: string; transactionId: string };
};

type DepositScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Deposit'>;
};

const QUICK_AMOUNTS = [50, 100, 250, 500, 1000];

export default function DepositScreen({ navigation }: DepositScreenProps) {
  const { light, success } = useHaptics();

  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState(0);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedQuickAmount, setSelectedQuickAmount] = useState<number | null>(null);

  // Admin campus deposit
  const [user, setUser] = useState<User | null>(null);
  const [depositTarget, setDepositTarget] = useState<'personal' | 'campus'>('personal');
  const [campusBalance, setCampusBalance] = useState(0);

  // Card fields (simulated)
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  useEffect(() => {
    async function loadData() {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        const wallet = await getUserWallet(currentUser.id);
        if (wallet) {
          setBalance(wallet.balance);
          setWalletId(wallet.id);
        }
        // Si admin campus, charger le solde du pot commun
        if (currentUser.admin_campus) {
          const campusWallets = await getCampusWallets();
          const myCampusWallet = campusWallets.find(
            (cw) => cw.campus_name === currentUser.admin_campus
          );
          if (myCampusWallet) {
            setCampusBalance(myCampusWallet.balance);
          }
        }
      }
    }
    loadData();
  }, []);

  // Validation
  const numericAmount = parseFloat(amount.replace(',', '.'));
  const isValidAmount = !isNaN(numericAmount) && numericAmount > 0;
  const isCardFilled = cardNumber.length >= 16 && cardExpiry.length >= 4 && cardCvc.length >= 3;
  const isValid = isValidAmount && isCardFilled;

  // Handlers
  const handleAmountChange = (text: string) => {
    setSelectedQuickAmount(null);
    const formatted = formatAmountInput(text);
    setAmount(formatted);
  };

  const handleQuickAmount = (value: number) => {
    light();
    setSelectedQuickAmount(value);
    setAmount(value.toString().replace('.', ','));
  };

  const formatCardNumberInput = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 16);
    const groups = digits.match(/.{1,4}/g);
    setCardNumber(groups ? groups.join(' ') : digits);
  };

  const formatExpiryInput = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) {
      setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setCardExpiry(digits);
    }
  };

  const formatCvcInput = (text: string) => {
    setCardCvc(text.replace(/\D/g, '').slice(0, 3));
  };

  const handleDeposit = async () => {
    if (!isValid) return;
    if (depositTarget === 'personal' && !walletId) return;
    if (depositTarget === 'campus' && !user?.admin_campus) return;

    setIsLoading(true);
    light();

    // Simulate Stripe processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      const result = depositTarget === 'campus'
        ? await adminDepositToCampus(user!.admin_campus!, numericAmount, user || undefined)
        : await depositFunds(walletId!, numericAmount, user || undefined);

      if (result.success && result.transactionId) {
        success();
        navigation.navigate('DepositSuccess', {
          amount: amount,
          transactionId: result.transactionId,
        });
      } else {
        Alert.alert('Échec du dépôt', result.errorMessage || 'Une erreur est survenue.');
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de contacter le serveur. Réessayez.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-screen pt-2 pb-4">
        <Pressable onPress={() => navigation.goBack()} className="mb-4 w-11 h-11 justify-center">
          <ChevronLeft color="#1D1D1F" size={28} />
        </Pressable>
        <Text className="text-largeTitle text-ink-primary">
          Déposer
        </Text>
        <Text className="text-subheadline text-ink-secondary mt-2">
          Alimentez votre wallet via carte bancaire.
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Admin Deposit Target Selector */}
          {user?.admin_campus && (
            <View className="flex-row gap-3 mt-4 mb-4">
              <Pressable
                onPress={() => { light(); setDepositTarget('personal'); }}
                style={depositTarget === 'personal' ? shadows.soft : undefined}
                className={`
                  flex-1 flex-row items-center justify-center rounded-button px-4 py-3 border-2
                  ${depositTarget === 'personal'
                    ? 'bg-primary border-primary'
                    : 'bg-surface border-separator-opaque'
                  }
                `}
              >
                <Wallet size={18} color={depositTarget === 'personal' ? '#FFFFFF' : '#1D1D1F'} style={{ marginRight: 8 }} />
                <Text className={`text-subheadline font-semibold ${depositTarget === 'personal' ? 'text-white' : 'text-ink-primary'}`}>
                  Mon wallet
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { light(); setDepositTarget('campus'); }}
                style={depositTarget === 'campus' ? shadows.soft : undefined}
                className={`
                  flex-1 flex-row items-center justify-center rounded-button px-4 py-3 border-2
                  ${depositTarget === 'campus'
                    ? 'bg-primary border-primary'
                    : 'bg-surface border-separator-opaque'
                  }
                `}
              >
                <Building2 size={18} color={depositTarget === 'campus' ? '#FFFFFF' : '#1D1D1F'} style={{ marginRight: 8 }} />
                <Text className={`text-subheadline font-semibold ${depositTarget === 'campus' ? 'text-white' : 'text-ink-primary'}`}>
                  {user.admin_campus}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Balance Card */}
          <Card variant="elevated" padding="lg" className={`mb-6 ${user?.admin_campus ? '' : 'mt-4'}`}>
            <Text className="text-footnote text-ink-tertiary mb-2">
              {depositTarget === 'campus' ? `Pot commun ${user?.admin_campus}` : 'Mon wallet'}
            </Text>
            <Text className="text-largeTitle text-ink-primary">
              {formatCurrency(depositTarget === 'campus' ? campusBalance : balance)}
            </Text>
          </Card>

          {/* Quick Amounts */}
          <Text className="text-headline text-ink-secondary mb-3 ml-1">
            Montant
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {QUICK_AMOUNTS.map((value) => (
              <Pressable
                key={value}
                onPress={() => handleQuickAmount(value)}
                style={({ pressed }) => [
                  {
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  },
                  selectedQuickAmount === value ? shadows.soft : undefined,
                ]}
                className={`
                  rounded-button px-5 py-3 border-2
                  ${selectedQuickAmount === value
                    ? 'bg-primary border-primary'
                    : 'bg-surface border-separator-opaque'
                  }
                `}
              >
                <Text
                  className={`text-headline ${
                    selectedQuickAmount === value ? 'text-white' : 'text-ink-primary'
                  }`}
                >
                  {value} EPC
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Custom Amount Input */}
          <View
            className={`
              flex-row items-center bg-surface rounded-input px-5 py-4 border-2 mb-6
              ${isFocused ? 'border-primary' : 'border-separator-opaque'}
            `}
            style={isFocused ? shadows.soft : undefined}
          >
            <Text className="text-title1 text-ink-tertiary font-normal mr-3">EPC</Text>
            <View className="w-px h-8 bg-separator-opaque mr-4" />
            <TextInput
              value={amount}
              onChangeText={handleAmountChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              keyboardType="decimal-pad"
              placeholder="Montant libre"
              placeholderTextColor="#86868B"
              className="flex-1 text-ink-primary"
              style={{ padding: 0, fontSize: 22, fontWeight: '700', height: 48 }}
            />
          </View>

          {/* Card Section (Stripe Simulation) */}
          <Card variant="elevated" padding="lg" className="mb-6">
            <View className="flex-row items-center mb-4">
              <CreditCard size={20} color="#3B82F6" style={{ marginRight: 8 }} />
              <Text className="text-headline text-ink-primary">
                Carte bancaire
              </Text>
            </View>

            {/* Card Number */}
            <Text className="text-footnote text-ink-secondary mb-2 ml-1">
              Numéro de carte
            </Text>
            <View className="flex-row items-center bg-background rounded-input px-4 py-3.5 border border-separator-opaque mb-3">
              <TextInput
                value={cardNumber}
                onChangeText={formatCardNumberInput}
                keyboardType="number-pad"
                placeholder="4242 4242 4242 4242"
                placeholderTextColor="#86868B"
                maxLength={19}
                className="flex-1 text-body text-ink-primary"
                style={{ padding: 0 }}
              />
              <CreditCard size={18} color="#86868B" />
            </View>

            {/* Expiry + CVC */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-footnote text-ink-secondary mb-2 ml-1">
                  Expiration
                </Text>
                <View className="flex-row items-center bg-background rounded-input px-4 py-3.5 border border-separator-opaque">
                  <TextInput
                    value={cardExpiry}
                    onChangeText={formatExpiryInput}
                    keyboardType="number-pad"
                    placeholder="MM/AA"
                    placeholderTextColor="#86868B"
                    maxLength={5}
                    className="flex-1 text-body text-ink-primary"
                    style={{ padding: 0 }}
                  />
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-footnote text-ink-secondary mb-2 ml-1">
                  CVC
                </Text>
                <View className="flex-row items-center bg-background rounded-input px-4 py-3.5 border border-separator-opaque">
                  <TextInput
                    value={cardCvc}
                    onChangeText={formatCvcInput}
                    keyboardType="number-pad"
                    placeholder="123"
                    placeholderTextColor="#86868B"
                    maxLength={3}
                    secureTextEntry
                    className="flex-1 text-body text-ink-primary"
                    style={{ padding: 0 }}
                  />
                </View>
              </View>
            </View>

            {/* Stripe Badge */}
            <View className="flex-row items-center justify-center mt-4 gap-1.5">
              <Lock size={12} color="#86868B" />
              <Text className="text-caption2 text-ink-tertiary">
                Paiement sécurisé par Stripe
              </Text>
            </View>
          </Card>

          {/* Deposit Button */}
          <Pressable
            onPress={handleDeposit}
            disabled={!isValid || isLoading}
            style={({ pressed }) => [
              isValid ? shadows.primaryButton : undefined,
              {
                transform: [{ scale: pressed && isValid ? 0.98 : 1 }],
                opacity: !isValid ? 0.5 : 1,
              },
            ]}
            className={`
              rounded-button py-4 items-center justify-center flex-row
              ${isValid ? 'bg-primary' : 'bg-ink-disabled'}
            `}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-headline text-white">
                Déposer {isValidAmount ? `${amount} EPC` : ''}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
