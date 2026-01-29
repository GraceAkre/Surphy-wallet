import React from 'react';
import { View, Text } from 'react-native';

/**
 * Badge Component
 * Status indicators and labels
 */

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const VARIANT_STYLES = {
  success: {
    bg: 'bg-success',
    text: 'text-white',
  },
  warning: {
    bg: 'bg-warning',
    text: 'text-white',
  },
  danger: {
    bg: 'bg-danger',
    text: 'text-white',
  },
  neutral: {
    bg: 'bg-ink-tertiary',
    text: 'text-white',
  },
  info: {
    bg: 'bg-primary',
    text: 'text-white',
  },
};

const SIZE_STYLES = {
  sm: {
    container: 'px-1.5 py-0.5 rounded',
    text: 'text-caption2 font-bold',
  },
  md: {
    container: 'px-2 py-1 rounded-badge',
    text: 'text-caption1 font-bold',
  },
};

export function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
}: BadgeProps) {
  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];

  return (
    <View className={`${variantStyle.bg} ${sizeStyle.container}`}>
      <Text className={`${variantStyle.text} ${sizeStyle.text} uppercase`}>
        {children}
      </Text>
    </View>
  );
}

export default Badge;
