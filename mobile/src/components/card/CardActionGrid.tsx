import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LucideIcon, Lock, Eye, EyeOff, BarChart2, Key } from 'lucide-react-native';
import { shadows } from '../../utils/shadows';
import { useHaptics } from '../../hooks/useHaptics';

/**
 * CardActionGrid Component
 * 2x2 grid of card action buttons
 */

interface CardAction {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  isDanger?: boolean;
  isActive?: boolean;
}

interface CardActionGridProps {
  isLocked: boolean;
  showDetails: boolean;
  onToggleLock: () => void;
  onToggleDetails: () => void;
  onShowLimits: () => void;
  onShowPin: () => void;
}

function ActionButton({
  icon: Icon,
  label,
  onPress,
  isDanger = false,
  isActive = false,
}: CardAction) {
  const { light } = useHaptics();

  const handlePress = () => {
    light();
    onPress();
  };

  const bgColor = isDanger && isActive
    ? 'bg-danger-50'
    : 'bg-surface';

  const borderColor = isDanger && isActive
    ? 'border-danger'
    : 'border-separator-opaque';

  const iconColor = isDanger
    ? '#FF3B30'
    : '#374151';

  const textColor = isDanger
    ? 'text-danger'
    : 'text-ink-primary';

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        shadows.soft,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
      className={`
        flex-1 min-w-[45%] p-4 rounded-card border ${borderColor} ${bgColor}
        items-center justify-center gap-2
      `}
    >
      <Icon size={24} color={iconColor} />
      <Text className={`font-medium text-subheadline ${textColor}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export function CardActionGrid({
  isLocked,
  showDetails,
  onToggleLock,
  onToggleDetails,
  onShowLimits,
  onShowPin,
}: CardActionGridProps) {
  return (
    <View className="gap-3">
      {/* Row 1 */}
      <View className="flex-row gap-3">
        <ActionButton
          icon={Lock}
          label={isLocked ? 'Déverrouiller' : 'Verrouiller'}
          onPress={onToggleLock}
          isDanger
          isActive={isLocked}
        />
        <ActionButton
          icon={showDetails ? EyeOff : Eye}
          label={showDetails ? 'Masquer' : 'Voir détails'}
          onPress={onToggleDetails}
        />
      </View>

      {/* Row 2 */}
      <View className="flex-row gap-3">
        <ActionButton
          icon={BarChart2}
          label="Limites"
          onPress={onShowLimits}
        />
        <ActionButton
          icon={Key}
          label="Code PIN"
          onPress={onShowPin}
        />
      </View>
    </View>
  );
}

export default CardActionGrid;
