import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Check,
  ShieldAlert,
  CreditCard,
  HelpCircle,
  Clock,
  MapPin,
  Zap,
  Globe,
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

// Components
import { Card, Button, Badge } from '../components/ui';
import { AlertBanner, SelectableCard } from '../components/feedback';

// Utils
import { shadows } from '../utils/shadows';
import { formatCurrency } from '../utils/formatters';
import { useHaptics } from '../hooks/useHaptics';

// --- Types & Navigation ---

type RootStackParamList = {
  Home: undefined;
  Verification: { transactionId: string };
  Explicability: { transactionId: string };
  FraudReport: { transactionId: string };
};

type VerificationScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Verification'>;
  route: RouteProp<RootStackParamList, 'Verification'>;
};

// --- Constantes & Mapping ---

const REASON_DETAILS: Record<string, { icon: any; title: string; description: string }> = {
  AMOUNT_HIGH: { icon: Zap, title: 'Montant élevé', description: 'Supérieur à 2500 EPC inhabituel' },
  TIME_SUSPICIOUS: {
    icon: Clock,
    title: 'Horaire suspect',
    description: 'Transaction nocturne (00h-06h)',
  },
  LOCATION_CHANGE: {
    icon: MapPin,
    title: 'Changement de lieu',
    description: 'Pays différent dernière transaction',
  },
  IP_GEO_MISMATCH: {
    icon: Globe,
    title: 'Localisation incohérente',
    description: 'Écart IP vs Position GPS',
  },
};

// Mock Transaction Data (à remplacer par données Supabase)
const MOCK_TX = {
  id: 'tx_123',
  merchantName: 'Amazon FR',
  amount: 600.0,
  date: '25 Jan 14:32',
  reasons: ['AMOUNT_HIGH', 'LOCATION_CHANGE'],
  status: 'review_required',
};

export default function VerificationScreen({ navigation, route }: VerificationScreenProps) {
  const insets = useSafeAreaInsets();
  const { light, success, error: hapticError } = useHaptics();

  const [loading, setLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'confirm' | 'deny' | null>(null);

  // --- Handlers ---

  const handleSelectAction = (action: 'confirm' | 'deny') => {
    light();
    setSelectedAction(action);
  };

  const handleAction = async () => {
    if (!selectedAction) return;

    setLoading(true);
    light();

    // Simulation API Call (Supabase logic placeholder)
    setTimeout(() => {
      setLoading(false);
      if (selectedAction === 'confirm') {
        success();
        Alert.alert('Succès', 'Transaction validée.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        hapticError();
        Alert.alert('Alerte Fraude', 'Votre carte a été bloquée préventivement.', [
          { text: 'Voir détails', onPress: () => console.log('Navigate Fraud') },
        ]);
      }
    }, 1500);
  };

  const handleBlockCard = () => {
    light();
    Alert.alert(
      'Bloquer la carte ?',
      "Cette action est immédiate et irréversible depuis l'application.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Bloquer maintenant',
          style: 'destructive',
          onPress: () => {
            hapticError();
            console.log('Block Card');
          },
        },
      ]
    );
  };

  // --- Render ---

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <SafeAreaView edges={['top']} className="bg-background">
        <View className="px-screen pt-2 pb-4">
          <Pressable
            onPress={() => {
              light();
              navigation.goBack();
            }}
            className="mb-4 w-11 h-11 justify-center"
          >
            <ChevronLeft color="#1D1D1F" size={28} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Alert Banner */}
        <View className="px-screen mb-6">
          <AlertBanner
            variant="danger"
            title="Vérification requise"
            message="Nous avons détecté une activité inhabituelle sur votre compte."
          />
        </View>

        {/* Transaction Details */}
        <Card variant="elevated" padding="lg" className="mx-screen mb-6">
          {/* Header */}
          <View className="flex-row justify-between items-start mb-2">
            <Text className="text-title2 text-ink-primary flex-1 mr-2">
              {MOCK_TX.merchantName}
            </Text>
            <Badge variant="warning" size="md">
              À vérifier
            </Badge>
          </View>

          {/* Amount */}
          <Text className="text-largeTitle text-ink-primary mb-2">
            - {formatCurrency(MOCK_TX.amount)}
          </Text>

          <Text className="text-footnote text-ink-tertiary mb-6">{MOCK_TX.date}</Text>

          {/* Reasons */}
          <View className="border-t border-separator-opaque pt-4">
            <Text className="text-headline text-ink-primary mb-3">Pourquoi cette alerte ?</Text>

            {MOCK_TX.reasons.map((code) => {
              const reason = REASON_DETAILS[code];
              if (!reason) return null;
              const Icon = reason.icon;
              return (
                <View key={code} className="flex-row items-center gap-3 mb-2">
                  <View className="w-8 h-8 bg-warning-50 rounded-lg items-center justify-center">
                    <Icon size={16} color="#FF9500" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-body text-ink-primary">{reason.title}</Text>
                    <Text className="text-footnote text-ink-tertiary">{reason.description}</Text>
                  </View>
                </View>
              );
            })}

            <Pressable
              onPress={() => {
                light();
                navigation.navigate('Explicability', { transactionId: MOCK_TX.id });
              }}
              className="mt-3"
            >
              <Text className="text-subheadline text-primary font-medium">
                En savoir plus sur l'IA de détection
              </Text>
            </Pressable>
          </View>
        </Card>

        {/* Action Selection */}
        <View className="px-screen">
          <Text className="text-headline text-ink-primary mb-4">Veuillez confirmer</Text>

          {/* Confirm Option */}
          <SelectableCard
            selected={selectedAction === 'confirm'}
            onPress={() => handleSelectAction('confirm')}
            disabled={loading}
            icon={Check}
            iconColor="#34C759"
            iconBgColor="bg-success-50"
            title="C'était bien moi"
            description="Confirmer que cette transaction est légitime."
          />

          {/* Deny Option */}
          <SelectableCard
            selected={selectedAction === 'deny'}
            onPress={() => handleSelectAction('deny')}
            disabled={loading}
            icon={ShieldAlert}
            iconColor="#FF3B30"
            iconBgColor="bg-danger-50"
            title="Ce n'était pas moi"
            description="Signaler l'activité comme frauduleuse."
          />

          {/* Submit Button */}
          {selectedAction && (
            <View className="mt-4">
              <Button
                variant={selectedAction === 'confirm' ? 'primary' : 'danger'}
                fullWidth
                loading={loading}
                onPress={handleAction}
              >
                {selectedAction === 'confirm' ? 'Valider la transaction' : 'Signaler la fraude'}
              </Button>
            </View>
          )}

          {/* Block Card Option */}
          <Pressable
            onPress={handleBlockCard}
            style={({ pressed }) => [
              shadows.card,
              { opacity: pressed ? 0.9 : 1 },
            ]}
            className="mt-8 bg-surface border border-danger-50 p-5 rounded-2xl flex-row items-center"
          >
            <View className="w-10 h-10 bg-danger-50 rounded-button items-center justify-center mr-4">
              <CreditCard size={20} color="#FF3B30" />
            </View>
            <View className="flex-1">
              <Text className="text-headline text-danger">Bloquer ma carte</Text>
              <Text className="text-footnote text-ink-tertiary">
                Empêcher toute nouvelle transaction
              </Text>
            </View>
          </Pressable>

          {/* Support Link */}
          <Pressable
            onPress={() => Alert.alert('Support', 'Contactez-nous à support@surphy.app')}
            className="flex-row justify-center items-center mt-8 mb-4 gap-2"
          >
            <HelpCircle size={18} color="#3B82F6" />
            <Text className="text-subheadline text-primary font-medium">Contacter le support</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
