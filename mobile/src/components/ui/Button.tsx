import React from 'react';
import { Pressable, Text, ActivityIndicator, View, PressableProps } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { shadows } from '../../utils/shadows';
import { useHaptics } from '../../hooks/useHaptics';

/**
 * Button Component
 * Primary action buttons following Apple HIG
 */

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  children: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

const VARIANT_STYLES = {
  primary: {
    container: 'bg-primary',
    text: 'text-white',
    shadow: shadows.primaryButton,
  },
  secondary: {
    container: 'bg-white border border-separator-opaque',
    text: 'text-ink-primary',
    shadow: shadows.soft,
  },
  danger: {
    container: 'bg-danger',
    text: 'text-white',
    shadow: shadows.dangerButton,
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-primary',
    shadow: shadows.none,
  },
};

const SIZE_STYLES = {
  sm: {
    container: 'py-2.5 px-4 rounded-button',
    text: 'text-subheadline font-semibold',
    icon: 16,
  },
  md: {
    container: 'py-3.5 px-6 rounded-button',
    text: 'text-body font-semibold',
    icon: 18,
  },
  lg: {
    container: 'py-4 px-8 rounded-card',
    text: 'text-headline font-semibold',
    icon: 20,
  },
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  iconPosition = 'left',
  onPress,
  ...props
}: ButtonProps) {
  const { light } = useHaptics();
  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];

  const handlePress = (e: any) => {
    if (!disabled && !loading) {
      light();
      onPress?.(e);
    }
  };

  const iconColor = variant === 'primary' || variant === 'danger' ? '#FFFFFF' : '#3B82F6';

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        variantStyle.shadow,
        {
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      className={`
        flex-row items-center justify-center
        ${variantStyle.container}
        ${sizeStyle.container}
        ${fullWidth ? 'w-full' : ''}
      `}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : '#3B82F6'}
          size="small"
        />
      ) : (
        <>
          {Icon && iconPosition === 'left' && (
            <Icon size={sizeStyle.icon} color={iconColor} style={{ marginRight: 8 }} />
          )}
          <Text className={`${variantStyle.text} ${sizeStyle.text}`}>
            {children}
          </Text>
          {Icon && iconPosition === 'right' && (
            <Icon size={sizeStyle.icon} color={iconColor} style={{ marginLeft: 8 }} />
          )}
        </>
      )}
    </Pressable>
  );
}

export default Button;
