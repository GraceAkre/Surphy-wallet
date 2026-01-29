import React, { useState } from 'react';
import { View, TextInput, Text, Pressable, TextInputProps } from 'react-native';
import { LucideIcon, Eye, EyeOff } from 'lucide-react-native';
import { shadows } from '../../utils/shadows';

/**
 * Input Component
 * Text input with label, icons, and error states
 */

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  onRightIconPress?: () => void;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  hint,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  onRightIconPress,
  secureTextEntry,
  containerClassName = '',
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = secureTextEntry !== undefined;
  const actualSecureEntry = isPassword && !showPassword;

  const borderColor = error
    ? 'border-danger'
    : isFocused
    ? 'border-primary'
    : 'border-separator-opaque';

  return (
    <View className={containerClassName}>
      {/* Label */}
      {label && (
        <Text className="text-footnote font-semibold text-ink-primary mb-2">
          {label}
        </Text>
      )}

      {/* Input Container */}
      <View
        className={`
          flex-row items-center
          bg-white rounded-input border ${borderColor}
          px-4
        `}
        style={isFocused ? shadows.soft : shadows.none}
      >
        {/* Left Icon */}
        {LeftIcon && (
          <LeftIcon size={20} color="#86868B" style={{ marginRight: 12 }} />
        )}

        {/* TextInput */}
        <TextInput
          className="flex-1 py-3.5 text-body text-ink-primary"
          placeholderTextColor="#86868B"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={actualSecureEntry}
          {...props}
        />

        {/* Right Icon or Password Toggle */}
        {isPassword ? (
          <Pressable onPress={() => setShowPassword(!showPassword)} className="p-2 -mr-2">
            {showPassword ? (
              <EyeOff size={20} color="#86868B" />
            ) : (
              <Eye size={20} color="#86868B" />
            )}
          </Pressable>
        ) : RightIcon ? (
          <Pressable
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            className="p-2 -mr-2"
          >
            <RightIcon size={20} color="#86868B" />
          </Pressable>
        ) : null}
      </View>

      {/* Error or Hint */}
      {error && (
        <Text className="text-caption1 text-danger mt-1.5 ml-1">{error}</Text>
      )}
      {!error && hint && (
        <Text className="text-caption1 text-ink-tertiary mt-1.5 ml-1">{hint}</Text>
      )}
    </View>
  );
}

export default Input;
