import React, { useState } from 'react';
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
import {
  ChevronLeft,
  User,
  ChevronRight,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Components
import { Card, Button } from '../components/ui';

// Utils
import { shadows } from '../utils/shadows';
import { formatCurrency, formatAmountInput } from '../utils/formatters';
import { useHaptics } from '../hooks/useHaptics';

// --- Types ---

type RootStackParamList = {
  Home: undefined;
  CardPayment: undefined;
  TransferSuccess: { amount: string; recipient: string; transactionId: string };
};

type CardPaymentScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CardPayment'>;
};

// Mock recipient
const MOCK_RECIPIENT = {
  id: 'user_99',
  name: 'Rif Lunasio',
  email: 'rif.lunasio@epitech.eu',
};

export default function CardPaymentScreen({ navigation }: CardPaymentScreenProps) {
  const { light, success, error: hapticError } = useHaptics();

  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState<typeof MOCK_RECIPIENT | null>(null);
  const [balance] = useState(1250.0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Validation
  const numericAmount = parseFloat(amount.replace(',', '.'));
  const isValidAmount = !isNaN(numericAmount) && numericAmount > 0 && numericAmount <= balance;
  const isValid = recipient !== null && isValidAmount;

  // Handlers
  const handleAmountChange = (text: string) => {
    const formatted = formatAmountInput(text);
    setAmount(formatted);
  };

  const handleSelectRecipient = () => {
    light();
    if (recipient) {
      setRecipient(null);
    } else {
      setRecipient(MOCK_RECIPIENT);
    }
  };

  const handleSend = async () => {
    if (!isValid) return;

    setIsLoading(true);
    light();

    // Simulate API call
    setTimeout(() => {
      success();
      setIsLoading(false);
      navigation.navigate('TransferSuccess', {
        amount: amount,
        recipient: recipient?.name || 'Inconnu',
        transactionId: 'TX-8884',
      });
    }, 1500);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-screen pt-2 pb-4">
        <Pressable onPress={() => navigation.goBack()} className="mb-4 w-11 h-11 justify-center">
          <ChevronLeft color="#1D1D1F" size={28} />
        </Pressable>
        <Text className="text-largeTitle text-ink-primary">
          Faire un virement
        </Text>
        <Text className="text-subheadline text-ink-secondary mt-2">
          Envoyez de l'argent entre étudiants en toute sécurité.
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
          {/* Balance Card */}
          <Card variant="elevated" padding="lg" className="mb-6 mt-4">
            <Text className="text-footnote text-ink-tertiary mb-2">
              Solde disponible
            </Text>
            <Text className="text-largeTitle text-ink-primary">
              {formatCurrency(balance)}
            </Text>
          </Card>

          {/* Recipient Selector */}
          <Text className="text-headline text-ink-secondary mb-4 ml-1">
            Destinataire
          </Text>

          <Pressable
            onPress={handleSelectRecipient}
            style={({ pressed }) => [
              shadows.card,
              { transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
            className={`
              bg-surface rounded-2xl p-4 mb-6 border-2
              flex-row items-center justify-between h-20
              ${recipient ? 'border-primary bg-primary-50' : 'border-separator-opaque'}
            `}
          >
            {recipient ? (
              <>
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center">
                    <Text className="text-primary font-bold text-lg">
                      {recipient.name.charAt(0)}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-headline text-ink-primary">
                      {recipient.name}
                    </Text>
                    <Text className="text-footnote text-ink-tertiary">
                      {recipient.email}
                    </Text>
                  </View>
                </View>
                <View className="bg-background rounded-full p-1">
                  <X size={16} color="#6E6E73" />
                </View>
              </>
            ) : (
              <>
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-background rounded-full items-center justify-center border border-separator-opaque border-dashed">
                    <User size={20} color="#6E6E73" />
                  </View>
                  <Text className="text-body text-ink-secondary font-medium">
                    Sélectionner un étudiant
                  </Text>
                </View>
                <ChevronRight size={20} color="#86868B" />
              </>
            )}
          </Pressable>

          {/* Amount Card */}
          <Card variant="elevated" padding="lg" className="mb-6">
            <Text className="text-headline text-ink-primary mb-4">
              Montant à transférer
            </Text>

            {/* Input */}
            <View
              className={`
                flex-row items-center bg-surface rounded-input px-5 py-4 border-2 mb-2
                ${isFocused ? 'border-primary' : amount && !isValidAmount ? 'border-danger' : 'border-separator-opaque'}
              `}
              style={isFocused ? shadows.soft : undefined}
            >
              <Text className="text-title1 text-ink-tertiary font-normal mr-3">€</Text>
              <View className="w-px h-8 bg-separator-opaque mr-4" />
              <TextInput
                value={amount}
                onChangeText={handleAmountChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                keyboardType="decimal-pad"
                placeholder="0,00"
                placeholderTextColor="#86868B"
                className="flex-1 text-title1 font-bold text-ink-primary h-12"
                style={{ padding: 0 }}
              />
            </View>

            {/* Error */}
            {amount && !isValidAmount && (
              <Text className="text-footnote text-danger font-medium ml-1 mt-1">
                Solde insuffisant ({formatCurrency(balance)} max)
              </Text>
            )}

            <Text className="text-footnote text-ink-tertiary mt-4 leading-5">
              Les virements sont instantanés et gratuits entre membres du campus.
            </Text>

            {/* Send Button */}
            <Pressable
              onPress={handleSend}
              disabled={!isValid || isLoading}
              style={({ pressed }) => [
                isValid ? shadows.primaryButton : undefined,
                {
                  transform: [{ scale: pressed && isValid ? 0.98 : 1 }],
                  opacity: !isValid ? 0.5 : 1,
                },
              ]}
              className={`
                mt-6 rounded-button py-4 items-center justify-center flex-row
                ${isValid ? 'bg-primary' : 'bg-ink-disabled'}
              `}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-headline text-white">
                  Envoyer {amount ? `${amount} €` : ''}
                </Text>
              )}
            </Pressable>
          </Card>

          {/* Security Badge */}
          <View className="bg-surface rounded-card p-4 border border-separator-opaque flex-row items-center gap-3">
            <View className="w-10 h-10 bg-primary-50 rounded-button items-center justify-center">
              <ShieldCheck size={24} color="#3B82F6" />
            </View>
            <View className="flex-1">
              <Text className="text-headline text-ink-primary">Paiement sécurisé</Text>
              <Text className="text-footnote text-ink-tertiary">
                Cryptage SSL 256-bit de bout en bout.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
