import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { AlertTriangle, ChevronRight, Info, CheckCircle, XCircle, LucideIcon } from 'lucide-react-native';
import { shadows } from '../../utils/shadows';
import { useHaptics } from '../../hooks/useHaptics';

/**
 * AlertBanner Component
 * Contextual alerts and notifications
 */

type AlertVariant = 'warning' | 'danger' | 'success' | 'info';

interface AlertBannerProps {
  variant?: AlertVariant;
  title: string;
  message?: string;
  actionLabel?: string;
  onPress?: () => void;
  icon?: LucideIcon;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const VARIANT_CONFIG = {
  warning: {
    bgColor: 'bg-warning-50',
    borderColor: 'border-warning-100',
    iconBg: 'bg-warning-100',
    iconColor: '#FF9500',
    Icon: AlertTriangle,
  },
  danger: {
    bgColor: 'bg-danger-50',
    borderColor: 'border-danger-100',
    iconBg: 'bg-danger-100',
    iconColor: '#FF3B30',
    Icon: XCircle,
  },
  success: {
    bgColor: 'bg-success-50',
    borderColor: 'border-success-100',
    iconBg: 'bg-success-100',
    iconColor: '#34C759',
    Icon: CheckCircle,
  },
  info: {
    bgColor: 'bg-primary-50',
    borderColor: 'border-primary-100',
    iconBg: 'bg-primary-100',
    iconColor: '#3B82F6',
    Icon: Info,
  },
};

export function AlertBanner({
  variant = 'warning',
  title,
  message,
  actionLabel,
  onPress,
  icon,
  dismissible = false,
  onDismiss,
}: AlertBannerProps) {
  const { medium } = useHaptics();
  const config = VARIANT_CONFIG[variant];
  const DisplayIcon = icon || config.Icon;

  const handlePress = () => {
    if (onPress) {
      medium();
      onPress();
    }
  };

  const content = (
    <View
      className={`
        ${config.bgColor} ${config.borderColor}
        border rounded-2xl p-4 flex-row items-center
      `}
      style={shadows.soft}
    >
      {/* Icon */}
      <View className={`w-10 h-10 ${config.iconBg} rounded-full items-center justify-center mr-3`}>
        <DisplayIcon size={20} color={config.iconColor} />
      </View>

      {/* Content */}
      <View className="flex-1">
        <Text className="text-headline text-ink-primary">{title}</Text>
        {message && (
          <Text className="text-footnote text-ink-secondary mt-0.5">
            {message}
          </Text>
        )}
      </View>

      {/* Action Indicator */}
      {onPress && (
        <ChevronRight size={20} color="#86868B" />
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

export default AlertBanner;
