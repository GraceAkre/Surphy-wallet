import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { Transaction } from '../../lib/types';
import {
  getTransactionIcon,
  getTransactionBgColor,
  getMerchantName,
  getStatusBadge,
} from '../../utils/transactionHelpers';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { Badge } from '../ui/Badge';

/**
 * TransactionItem Component
 * Single transaction row in a list
 */

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: (transaction: Transaction) => void;
  showBadge?: boolean;
  isLast?: boolean;
}

export function TransactionItem({
  transaction,
  onPress,
  showBadge = true,
  isLast = false,
}: TransactionItemProps) {
  const Icon = getTransactionIcon(transaction);
  const bgColor = getTransactionBgColor(transaction);
  const merchantName = getMerchantName(transaction);
  const badge = getStatusBadge(transaction);

  const isIncoming = transaction.direction === 'incoming';
  const formattedAmount = formatCurrency(transaction.amount, { showSign: false });
  const amountDisplay = isIncoming ? `+${formattedAmount}` : `-${formattedAmount}`;

  const getBadgeVariant = () => {
    if (badge.bgColor === '#34C759') return 'success';
    if (badge.bgColor === '#FF9500') return 'warning';
    if (badge.bgColor === '#FF3B30') return 'danger';
    return 'neutral';
  };

  return (
    <Pressable
      onPress={() => onPress?.(transaction)}
      disabled={!onPress}
      style={({ pressed }) => [
        { backgroundColor: pressed && onPress ? '#F9FAFB' : 'white' },
      ]}
      className={`
        flex-row items-center px-4 py-3.5
        ${!isLast ? 'border-b border-separator-opaque/50' : ''}
      `}
    >
      {/* Icon */}
      <View
        className="w-12 h-12 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: bgColor }}
      >
        <Icon size={20} color="#374151" />
      </View>

      {/* Info */}
      <View className="flex-1 gap-0.5">
        <Text className="text-subheadline font-semibold text-ink-primary">
          {merchantName}
        </Text>
        <Text className="text-footnote text-ink-tertiary">
          {formatDate(transaction.created_at)}
        </Text>
      </View>

      {/* Amount & Badge */}
      <View className="items-end gap-1">
        <Text
          className={`text-subheadline font-bold ${
            isIncoming ? 'text-success' : 'text-ink-primary'
          }`}
        >
          {amountDisplay}
        </Text>
        {showBadge && (
          <Badge variant={getBadgeVariant()} size="sm">
            {badge.label}
          </Badge>
        )}
      </View>
    </Pressable>
  );
}

export default TransactionItem;
