import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Hash,
  Wallet,
  Globe,
  MapPin,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

// Components
import { Card, Badge } from '../components/ui';

// Utils
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  getMerchantName,
  getStatusBadge,
  getTransactionRisks,
} from '../utils/transactionHelpers';

// API
import { getTransactionById } from '../lib/api';
import type { Transaction } from '../lib/types';

// --- Types ---

type RootStackParamList = {
  TransactionDetail: { id: string };
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TransactionDetail'>;
  route: RouteProp<RootStackParamList, 'TransactionDetail'>;
};

export default function TransactionDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const tx = await getTransactionById(id);
      setTransaction(tx);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="px-screen pt-2 pb-4">
          <Pressable onPress={() => navigation.goBack()} className="mb-4 w-11 h-11 justify-center">
            <ChevronLeft color="#1D1D1F" size={28} />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-body text-ink-secondary text-center">
            Transaction introuvable
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isIncoming = transaction.direction === 'incoming';
  const badge = getStatusBadge(transaction);
  const risks = getTransactionRisks(transaction);
  const merchantName = getMerchantName(transaction);

  const getBadgeVariant = () => {
    if (badge.bgColor === '#34C759') return 'success' as const;
    if (badge.bgColor === '#FF9500') return 'warning' as const;
    if (badge.bgColor === '#FF3B30') return 'danger' as const;
    return 'neutral' as const;
  };

  const formattedAmount = formatCurrency(transaction.amount, { showSign: false });

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-screen pt-2 pb-4">
        <Pressable onPress={() => navigation.goBack()} className="mb-4 w-11 h-11 justify-center">
          <ChevronLeft color="#1D1D1F" size={28} />
        </Pressable>
        <Text className="text-largeTitle text-ink-primary">
          {merchantName}
        </Text>
        <View className="mt-2">
          <Badge variant={getBadgeVariant()} size="md">
            {badge.label}
          </Badge>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Card */}
        <Card variant="elevated" padding="lg" className="mb-6 mt-2 items-center">
          <View className="w-16 h-16 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: isIncoming ? '#DCFCE7' : '#FEE2E2' }}
          >
            {isIncoming ? (
              <ArrowDownLeft size={32} color="#22C55E" />
            ) : (
              <ArrowUpRight size={32} color="#EF4444" />
            )}
          </View>
          <Text className={`text-largeTitle font-bold ${isIncoming ? 'text-success' : 'text-ink-primary'}`}>
            {isIncoming ? '+' : '-'}{formattedAmount}
          </Text>
          <Text className="text-footnote text-ink-tertiary mt-1">
            {transaction.currency}
          </Text>
        </Card>

        {/* Details Card */}
        <Card variant="elevated" padding="lg" className="mb-6">
          <Text className="text-headline text-ink-primary mb-4">
            Informations
          </Text>

          <DetailRow
            icon={<Calendar size={18} color="#6E6E73" />}
            label="Date"
            value={formatDate(transaction.created_at, { relative: true, includeTime: true, format: 'long' })}
          />

          <DetailRow
            icon={<Wallet size={18} color="#6E6E73" />}
            label="Type"
            value={transaction.transaction_type === 'transfer' ? 'Virement' :
                   transaction.transaction_type === 'payment' ? 'Paiement' :
                   transaction.transaction_type === 'deposit' ? 'Dépôt' : 'Retrait'}
          />

          <DetailRow
            icon={isIncoming
              ? <ArrowDownLeft size={18} color="#22C55E" />
              : <ArrowUpRight size={18} color="#EF4444" />}
            label="Direction"
            value={isIncoming ? 'Entrant' : 'Sortant'}
          />

          <DetailRow
            icon={<Hash size={18} color="#6E6E73" />}
            label="Fournisseur"
            value={transaction.provider}
          />

          {transaction.country && (
            <DetailRow
              icon={<Globe size={18} color="#6E6E73" />}
              label="Pays"
              value={transaction.country}
            />
          )}

          {transaction.city && (
            <DetailRow
              icon={<MapPin size={18} color="#6E6E73" />}
              label="Ville"
              value={transaction.city}
            />
          )}

          <DetailRow
            icon={<Hash size={18} color="#6E6E73" />}
            label="Référence"
            value={transaction.request_id.slice(0, 8).toUpperCase()}
            isLast
          />
        </Card>

        {/* ML Score Card (if available) */}
        {transaction.score_ml !== null && (
          <Card variant="elevated" padding="lg" className="mb-6">
            <Text className="text-headline text-ink-primary mb-4">
              Analyse de risque
            </Text>

            {/* Score Bar */}
            <View className="mb-4">
              <View className="flex-row justify-between mb-2">
                <Text className="text-subheadline text-ink-secondary">Score ML</Text>
                <Text className={`text-headline font-bold ${
                  transaction.score_ml < 30 ? 'text-success' :
                  transaction.score_ml < 70 ? 'text-warning' : 'text-danger'
                }`}>
                  {transaction.score_ml}/100
                </Text>
              </View>
              <View className="h-3 bg-fill-tertiary rounded-full overflow-hidden">
                <View
                  className={`h-full rounded-full ${
                    transaction.score_ml < 30 ? 'bg-success' :
                    transaction.score_ml < 70 ? 'bg-warning' : 'bg-danger'
                  }`}
                  style={{ width: `${transaction.score_ml}%` }}
                />
              </View>
            </View>

            {/* Risk Reasons */}
            {risks.length > 0 && (
              <View>
                <Text className="text-subheadline text-ink-secondary mb-3">
                  Raisons
                </Text>
                {risks.map((risk, index) => (
                  <View
                    key={risk.code}
                    className={`flex-row items-center py-3 ${
                      index < risks.length - 1 ? 'border-b border-separator-opaque/50' : ''
                    }`}
                  >
                    <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                      risk.severity === 'high' ? 'bg-red-50' : 'bg-orange-50'
                    }`}>
                      <ShieldAlert size={16} color={risk.severity === 'high' ? '#EF4444' : '#F59E0B'} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-subheadline font-semibold text-ink-primary">
                        {risk.code} — {risk.title}
                      </Text>
                      <Text className="text-footnote text-ink-tertiary">
                        {risk.description}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>
        )}

        {/* Security footer */}
        {transaction.score_ml === null && (
          <View className="flex-row items-center gap-3 px-2">
            <ShieldCheck size={20} color="#22C55E" />
            <Text className="text-footnote text-ink-tertiary flex-1">
              Aucune alerte de sécurité pour cette transaction.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Detail Row Component ---

function DetailRow({
  icon,
  label,
  value,
  isLast = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View className={`flex-row items-center py-3 ${!isLast ? 'border-b border-separator-opaque/50' : ''}`}>
      <View className="w-8 h-8 bg-fill-tertiary rounded-full items-center justify-center mr-3">
        {icon}
      </View>
      <Text className="text-subheadline text-ink-tertiary flex-1">{label}</Text>
      <Text className="text-subheadline font-semibold text-ink-primary">{value}</Text>
    </View>
  );
}
