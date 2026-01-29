import React from 'react';
import { View, Text } from 'react-native';
import { LucideIcon, Inbox } from 'lucide-react-native';
import { Button } from '../ui/Button';

/**
 * EmptyState Component
 * Placeholder for empty content areas
 */

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="items-center py-12 px-6">
      {/* Icon */}
      <View className="w-16 h-16 bg-background rounded-full items-center justify-center mb-4">
        <Icon size={32} color="#86868B" />
      </View>

      {/* Title */}
      <Text className="text-title3 text-ink-primary text-center mb-2">
        {title}
      </Text>

      {/* Message */}
      {message && (
        <Text className="text-body text-ink-secondary text-center mb-6">
          {message}
        </Text>
      )}

      {/* Action */}
      {actionLabel && onAction && (
        <Button variant="secondary" onPress={onAction}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

export default EmptyState;
