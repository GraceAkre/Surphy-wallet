import React from 'react';
import { View, Text } from 'react-native';
import type { Transaction } from '../../lib/types';
import { TransactionItem } from './TransactionItem';
import { Card } from '../ui/Card';
import { shadows } from '../../utils/shadows';
import { Inbox } from 'lucide-react-native';

/**
 * TransactionList Component
 * List of transactions in a card container
 */

interface TransactionListProps {
  transactions: Transaction[];
  onTransactionPress?: (transaction: Transaction) => void;
  showBadges?: boolean;
  emptyMessage?: string;
  maxItems?: number;
}

export function TransactionList({
  transactions,
  onTransactionPress,
  showBadges = true,
  emptyMessage = 'Aucune transaction',
  maxItems,
}: TransactionListProps) {
  const displayedTransactions = maxItems
    ? transactions.slice(0, maxItems)
    : transactions;

  if (transactions.length === 0) {
    return (
      <View
        className="bg-surface rounded-2xl border border-separator-opaque/50 p-8 items-center"
        style={shadows.card}
      >
        <View className="w-12 h-12 bg-background rounded-full items-center justify-center mb-3">
          <Inbox size={24} color="#86868B" />
        </View>
        <Text className="text-body text-ink-tertiary text-center">
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <View
      className="bg-surface rounded-2xl border border-separator-opaque/50 overflow-hidden"
      style={shadows.card}
    >
      {displayedTransactions.map((transaction, index) => (
        <TransactionItem
          key={transaction.id}
          transaction={transaction}
          onPress={onTransactionPress}
          showBadge={showBadges}
          isLast={index === displayedTransactions.length - 1}
        />
      ))}
    </View>
  );
}

export default TransactionList;
