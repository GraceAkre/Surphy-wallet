import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  Tag,
  FileText,
  Repeat,
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

// Components
import { Card, Badge, Button, RiskGauge } from '../../components/ui';

// API
import {
  getTransactionById,
  createLabel,
  updateTransactionDecision,
} from '../../lib/analystApi';
import type { Transaction } from '../../lib/types';

// Utils
import { shadows } from '../../utils/shadows';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getMerchantName, getRiskReason, getStatusBadge } from '../../utils/transactionHelpers';
import { useHaptics } from '../../hooks/useHaptics';

// --- Types ---

type AlertDetailScreenProps = {
  navigation: any;
  route: RouteProp<{ AlertDetail: { transactionId: string } }, 'AlertDetail'>;
};

// Label button configs
const LABEL_BUTTONS = [
  {
    label: 'Fraude',
    labelType: 'fraud',
    labelValue: 'confirmed_fraud',
    icon: ShieldX,
    bgColor: 'bg-danger',
    textColor: 'text-white',
    iconColor: '#FFFFFF',
    decision: 'block',
    status: 'blocked',
  },
  {
    label: 'Légitime',
    labelType: 'legit',
    labelValue: 'confirmed_legit',
    icon: ShieldCheck,
    bgColor: 'bg-success',
    textColor: 'text-white',
    iconColor: '#FFFFFF',
    decision: 'approve',
    status: 'approved',
  },
  {
    label: 'Doublon',
    labelType: 'category',
    labelValue: 'duplicate',
    icon: Repeat,
    bgColor: 'bg-warning',
    textColor: 'text-white',
    iconColor: '#FFFFFF',
    decision: null,
    status: null,
  },
  {
    label: 'Abonnement',
    labelType: 'category',
    labelValue: 'subscription',
    icon: Tag,
    bgColor: 'bg-primary',
    textColor: 'text-white',
    iconColor: '#FFFFFF',
    decision: null,
    status: null,
  },
];

// Severity colors
const SEVERITY_COLORS = {
  low: { bg: '#ECFDF5', text: '#34C759', border: '#34C759' },
  medium: { bg: '#FFFBEB', text: '#FF9500', border: '#FF9500' },
  high: { bg: '#FEF2F2', text: '#FF3B30', border: '#FF3B30' },
};

export default function AlertDetailScreen({ navigation, route }: AlertDetailScreenProps) {
  const { transactionId } = route.params;
  const { light, success: hapticSuccess, error: hapticError } = useHaptics();

  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [labeling, setLabeling] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchTransaction();
  }, [transactionId]);

  const fetchTransaction = async () => {
    setLoading(true);
    const data = await getTransactionById(transactionId);
    setTransaction(data);
    setLoading(false);
  };

  const handleLabel = async (btn: (typeof LABEL_BUTTONS)[number]) => {
    if (!transaction) return;

    setLabeling(true);
    light();

    try {
      // Create the label
      const labelResult = await createLabel({
        transaction_id: transaction.id,
        label_type: btn.labelType,
        label_value: btn.labelValue,
        confidence: 'high',
        notes: notes || undefined,
      });

      if (!labelResult.success) {
        hapticError();
        Alert.alert('Erreur', labelResult.errorMessage || 'Impossible de créer le label');
        return;
      }

      // Update transaction decision/status if applicable
      if (btn.decision && btn.status) {
        const updateResult = await updateTransactionDecision(
          transaction.id,
          btn.decision,
          btn.status
        );
        if (!updateResult.success) {
          hapticError();
          Alert.alert('Erreur', updateResult.errorMessage || 'Impossible de mettre à jour');
          return;
        }
      }

      hapticSuccess();
      Alert.alert(
        'Label appliqué',
        `La transaction a été marquée comme "${btn.label}".`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      hapticError();
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setLabeling(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-body text-ink-secondary mt-4">Chargement...</Text>
      </View>
    );
  }

  if (!transaction) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <ShieldAlert size={64} color="#86868B" />
        <Text className="text-body text-ink-secondary mt-4 text-center">
          Transaction introuvable
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          className="mt-6 bg-primary px-6 py-3 rounded-button"
        >
          <Text className="text-headline text-white">Retour</Text>
        </Pressable>
      </View>
    );
  }

  const badge = getStatusBadge(transaction);
  const reasons = transaction.reasons_json || [];
  const reasonsDetail = transaction.reasons_detail as Record<string, any> | null;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center">
        <Pressable
          onPress={() => {
            light();
            navigation.goBack();
          }}
          className="w-11 h-11 rounded-full bg-surface items-center justify-center border border-separator-opaque"
          style={shadows.soft}
        >
          <ChevronLeft size={24} color="#1D1D1F" />
        </Pressable>
        <Text className="text-title2 text-ink-primary ml-3 font-semibold">Détail alerte</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Risk Gauge */}
        <Card variant="elevated" padding="lg" className="mx-screen mb-4 items-center">
          <RiskGauge score={Math.round(transaction.score_ml ?? 0)} size={200} />

          {/* Decision badge */}
          <View className="mt-3">
            <View
              style={{ backgroundColor: badge.bgColor }}
              className="px-4 py-2 rounded-full"
            >
              <Text style={{ color: badge.textColor }} className="text-subheadline font-bold">
                {badge.label}
              </Text>
            </View>
          </View>
        </Card>

        {/* Triggered Rules */}
        {reasons.length > 0 && (
          <View className="px-screen mb-4">
            <Text className="text-title2 text-ink-primary mb-3">Pourquoi cette alerte ?</Text>

            {reasons.map((code: string) => {
              const reason = getRiskReason(code);
              if (!reason) return null;
              const severity = SEVERITY_COLORS[reason.severity];
              const detail = reasonsDetail?.[code];

              return (
                <View
                  key={code}
                  style={[shadows.card, { borderLeftWidth: 3, borderLeftColor: severity.border }]}
                  className="bg-surface rounded-xl p-4 mb-3"
                >
                  <View className="flex-row items-center gap-2 mb-1">
                    <View
                      className="px-2 py-0.5 rounded"
                      style={{ backgroundColor: severity.bg }}
                    >
                      <Text
                        className="text-caption2 font-bold"
                        style={{ color: severity.text }}
                      >
                        {reason.code}
                      </Text>
                    </View>
                    <Text className="text-headline text-ink-primary flex-1">{reason.title}</Text>
                    <Badge
                      variant={
                        reason.severity === 'high'
                          ? 'danger'
                          : reason.severity === 'medium'
                          ? 'warning'
                          : 'success'
                      }
                      size="sm"
                    >
                      {reason.severity.toUpperCase()}
                    </Badge>
                  </View>
                  <Text className="text-footnote text-ink-secondary">{reason.description}</Text>
                  {detail && typeof detail === 'object' && detail.contribution && (
                    <Text className="text-caption1 text-ink-tertiary mt-1">
                      Contribution: +{detail.contribution} pts
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Transaction Info */}
        <View className="px-screen mb-4">
          <Text className="text-title2 text-ink-primary mb-3">Informations</Text>
          <Card variant="elevated" padding="md">
            <InfoRow label="Montant" value={formatCurrency(transaction.amount)} />
            <InfoRow label="Merchant" value={getMerchantName(transaction)} />
            <InfoRow
              label="Date"
              value={formatDate(transaction.created_at, { includeTime: true, format: 'long' })}
            />
            {transaction.country && <InfoRow label="Pays" value={transaction.country} />}
            {transaction.city && <InfoRow label="Ville" value={transaction.city} />}
            <InfoRow label="Type" value={transaction.transaction_type} />
            <InfoRow label="Direction" value={transaction.direction} isLast />
          </Card>
        </View>

        {/* Labelling Section */}
        <View className="px-screen mb-4">
          <Text className="text-title2 text-ink-primary mb-3">Labelliser</Text>

          {/* 2x2 Grid */}
          <View className="flex-row mb-3 gap-3">
            {LABEL_BUTTONS.slice(0, 2).map((btn) => {
              const Icon = btn.icon;
              return (
                <Pressable
                  key={btn.labelValue}
                  onPress={() => handleLabel(btn)}
                  disabled={labeling}
                  style={({ pressed }) => [
                    shadows.card,
                    {
                      opacity: pressed ? 0.8 : labeling ? 0.5 : 1,
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                    },
                  ]}
                  className={`${btn.bgColor} rounded-2xl p-4 flex-1 items-center justify-center`}
                  accessibilityLabel={`Labelliser comme ${btn.label}`}
                >
                  <Icon size={24} color={btn.iconColor} />
                  <Text className={`${btn.textColor} text-subheadline font-semibold mt-2`}>
                    {btn.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View className="flex-row gap-3">
            {LABEL_BUTTONS.slice(2, 4).map((btn) => {
              const Icon = btn.icon;
              return (
                <Pressable
                  key={btn.labelValue}
                  onPress={() => handleLabel(btn)}
                  disabled={labeling}
                  style={({ pressed }) => [
                    shadows.card,
                    {
                      opacity: pressed ? 0.8 : labeling ? 0.5 : 1,
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                    },
                  ]}
                  className={`${btn.bgColor} rounded-2xl p-4 flex-1 items-center justify-center`}
                  accessibilityLabel={`Labelliser comme ${btn.label}`}
                >
                  <Icon size={24} color={btn.iconColor} />
                  <Text className={`${btn.textColor} text-subheadline font-semibold mt-2`}>
                    {btn.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Notes */}
        <View className="px-screen mb-6">
          <Text className="text-footnote font-semibold text-ink-primary mb-2">
            Notes (optionnel)
          </Text>
          <View
            className="bg-surface border border-separator-opaque rounded-input px-4 py-3"
            style={shadows.soft}
          >
            <TextInput
              className="text-body text-ink-primary"
              placeholder="Ajouter une note..."
              placeholderTextColor="#86868B"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={notes}
              onChangeText={setNotes}
              style={{ minHeight: 80 }}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Helper Component ---

function InfoRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row justify-between py-3 ${
        !isLast ? 'border-b border-separator-opaque/50' : ''
      }`}
    >
      <Text className="text-body text-ink-secondary">{label}</Text>
      <Text className="text-body font-medium text-ink-primary">{value}</Text>
    </View>
  );
}
