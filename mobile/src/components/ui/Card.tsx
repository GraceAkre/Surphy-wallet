import React from 'react';
import { View, Pressable, PressableProps, ViewStyle } from 'react-native';
import { shadows } from '../../utils/shadows';

/**
 * Card Component
 * Container for grouped content with elevation
 */

type CardVariant = 'elevated' | 'flat' | 'outlined';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  onPress?: PressableProps['onPress'];
  className?: string;
  style?: ViewStyle;
}

const VARIANT_STYLES = {
  elevated: {
    className: 'bg-surface rounded-2xl border border-separator-opaque/20',
    shadow: shadows.card,
  },
  flat: {
    className: 'bg-surface rounded-2xl',
    shadow: shadows.none,
  },
  outlined: {
    className: 'bg-surface rounded-2xl border border-separator-opaque',
    shadow: shadows.none,
  },
};

const PADDING_STYLES = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  children,
  variant = 'elevated',
  padding = 'md',
  onPress,
  className = '',
  style,
}: CardProps) {
  const variantStyle = VARIANT_STYLES[variant];
  const paddingStyle = PADDING_STYLES[padding];

  const content = (
    <View
      className={`${variantStyle.className} ${paddingStyle} ${className}`}
      style={[variantStyle.shadow, style]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          { transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

export default Card;
