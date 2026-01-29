import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LucideIcon, Check } from 'lucide-react-native';
import { shadows } from '../../utils/shadows';
import { useHaptics } from '../../hooks/useHaptics';

/**
 * SelectableCard Component
 * Card that can be selected (radio-style)
 */

type SelectableCardVariant = 'default' | 'success' | 'danger';

interface SelectableCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  variant?: SelectableCardVariant;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}

const VARIANT_CONFIG = {
  default: {
    selectedBorder: 'border-primary',
    selectedBg: 'bg-primary-50',
    iconBg: 'bg-background',
    iconColor: '#6E6E73',
    selectedIconColor: '#3B82F6',
  },
  success: {
    selectedBorder: 'border-success',
    selectedBg: 'bg-success-50',
    iconBg: 'bg-success-50',
    iconColor: '#34C759',
    selectedIconColor: '#34C759',
  },
  danger: {
    selectedBorder: 'border-danger',
    selectedBg: 'bg-danger-50',
    iconBg: 'bg-danger-50',
    iconColor: '#FF3B30',
    selectedIconColor: '#FF3B30',
  },
};

export function SelectableCard({
  icon: Icon,
  title,
  description,
  variant = 'default',
  selected = false,
  disabled = false,
  onPress,
}: SelectableCardProps) {
  const { selection } = useHaptics();
  const config = VARIANT_CONFIG[variant];

  const handlePress = () => {
    if (!disabled && onPress) {
      selection();
      onPress();
    }
  };

  const borderClass = selected
    ? config.selectedBorder
    : 'border-separator-opaque';

  const bgClass = selected
    ? config.selectedBg
    : 'bg-surface';

  const iconColor = selected
    ? config.selectedIconColor
    : config.iconColor;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        shadows.card,
        {
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      className={`
        flex-row items-center p-4 rounded-card
        border-2 ${borderClass} ${bgClass}
      `}
    >
      {/* Icon */}
      <View
        className={`w-12 h-12 rounded-card items-center justify-center mr-4 ${config.iconBg}`}
      >
        <Icon size={24} color={iconColor} />
      </View>

      {/* Content */}
      <View className="flex-1">
        <Text className="text-headline text-ink-primary mb-0.5">
          {title}
        </Text>
        {description && (
          <Text className="text-subheadline text-ink-secondary leading-5">
            {description}
          </Text>
        )}
      </View>

      {/* Selection Indicator */}
      {selected && (
        <View className="w-6 h-6 bg-primary rounded-full items-center justify-center">
          <Check size={14} color="white" strokeWidth={3} />
        </View>
      )}
    </Pressable>
  );
}

export default SelectableCard;
