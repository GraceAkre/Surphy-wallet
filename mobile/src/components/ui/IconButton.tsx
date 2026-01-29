import React from 'react';
import { Pressable, PressableProps, View } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { shadows } from '../../utils/shadows';
import { useHaptics } from '../../hooks/useHaptics';

/**
 * IconButton Component
 * Circular buttons with icons for actions
 */

type IconButtonVariant = 'filled' | 'outlined' | 'ghost';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps extends Omit<PressableProps, 'style'> {
  icon: LucideIcon;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  color?: string;
  disabled?: boolean;
}

const VARIANT_STYLES = {
  filled: {
    container: 'bg-primary',
    iconColor: '#FFFFFF',
    shadow: shadows.soft,
  },
  outlined: {
    container: 'bg-white border border-separator-opaque',
    iconColor: '#6E6E73',
    shadow: shadows.soft,
  },
  ghost: {
    container: 'bg-transparent',
    iconColor: '#6E6E73',
    shadow: shadows.none,
  },
};

const SIZE_STYLES = {
  sm: {
    container: 'w-8 h-8',
    icon: 16,
  },
  md: {
    container: 'w-10 h-10',
    icon: 20,
  },
  lg: {
    container: 'w-12 h-12',
    icon: 24,
  },
};

export function IconButton({
  icon: Icon,
  variant = 'outlined',
  size = 'md',
  color,
  disabled = false,
  onPress,
  ...props
}: IconButtonProps) {
  const { light } = useHaptics();
  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];

  const handlePress = (e: any) => {
    if (!disabled) {
      light();
      onPress?.(e);
    }
  };

  const iconColor = color || variantStyle.iconColor;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        variantStyle.shadow,
        {
          transform: [{ scale: pressed && !disabled ? 0.95 : 1 }],
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      className={`
        ${variantStyle.container}
        ${sizeStyle.container}
        rounded-full items-center justify-center
      `}
      {...props}
    >
      <Icon size={sizeStyle.icon} color={iconColor} />
    </Pressable>
  );
}

export default IconButton;
