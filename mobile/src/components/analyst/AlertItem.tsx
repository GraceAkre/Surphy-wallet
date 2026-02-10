import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { Transaction } from '../../lib/types';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getMerchantName, getStatusBadge } from '../../utils/transactionHelpers';
import { shadows } from '../../utils/shadows';

interface AlertItemProps {
  transaction: Transaction;
  onPress: () => void;
}

function getScoreBadgeVariant(score: number | null): 'success' | 'warning' | 'danger' {
  if (!score || score < 30) return 'success';
  if (score < 70) return 'warning';
  return 'danger';
}

export function AlertItem({ transaction, onPress }: AlertItemProps) {
  const merchantName = getMerchantName(transaction);
  const badge = getStatusBadge(transaction);
  const scoreVariant = getScoreBadgeVariant(transaction.score_ml);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        shadows.card,
        {
          backgroundColor: pressed ? '#F9FAFB' : 'white',
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      className="flex-row items-center p-4 rounded-2xl border border-separator-opaque/20 mb-3"
    >
      {/* Avatar */}
      <Avatar size="md" name={merchantName} />

      {/* Info */}
      <View className="flex-1 ml-3">
        <Text className="text-body font-semibold text-ink-primary" numberOfLines={1}>
          {merchantName}
        </Text>
        <Text className="text-caption1 text-ink-secondary mt-0.5">
          {formatDate(transaction.created_at, { includeTime: true })}
        </Text>
      </View>

      {/* Amount + Score */}
      <View className="items-end ml-2">
        <Text className="text-body font-bold text-ink-primary">
          {formatCurrency(transaction.amount)}
        </Text>
        <View className="flex-row items-center gap-1.5 mt-1">
          {transaction.score_ml !== null && (
            <Badge variant={scoreVariant} size="sm">
              {String(Math.round(transaction.score_ml))}
            </Badge>
          )}
          <Badge
            variant={
              badge.bgColor === '#FF9500'
                ? 'warning'
                : badge.bgColor === '#FF3B30'
                ? 'danger'
                : badge.bgColor === '#34C759'
                ? 'success'
                : 'neutral'
            }
            size="sm"
          >
            {badge.label}
          </Badge>
        </View>
      </View>

      <ChevronRight size={16} color="#86868B" style={{ marginLeft: 4 }} />
    </Pressable>
  );
}

export default AlertItem;
