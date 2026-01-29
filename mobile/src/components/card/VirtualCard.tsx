import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Wifi, Lock, Copy } from 'lucide-react-native';
import { shadows } from '../../utils/shadows';
import type { CardDetails } from '../../lib/types';

/**
 * VirtualCard Component
 * Credit card visual representation
 */

interface VirtualCardProps {
  cardDetails: CardDetails;
  showDetails?: boolean;
  isLocked?: boolean;
  countdown?: number;
  onLongPress?: () => void;
}

export function VirtualCard({
  cardDetails,
  showDetails = false,
  isLocked = false,
  countdown,
  onLongPress,
}: VirtualCardProps) {
  const gradientColors = isLocked
    ? ['#9CA3AF', '#4B5563'] as const
    : ['#5B8FD8', '#7BB5F5'] as const;

  return (
    <Pressable
      onLongPress={onLongPress}
      style={({ pressed }) => [
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          shadows.elevated,
          {
            borderRadius: 20,
            padding: 24,
            minHeight: 220,
          },
        ]}
      >
        {/* Top Row */}
        <View className="flex-row justify-between items-start mb-8">
          <Text className="text-white font-bold text-lg tracking-wider">
            SURPHY
          </Text>
          <Wifi
            size={24}
            color="rgba(255,255,255,0.8)"
            style={{ transform: [{ rotate: '90deg' }] }}
          />
        </View>

        {/* Chip */}
        <View className="w-12 h-9 bg-yellow-400/80 rounded-md mb-6" />

        {/* Card Number */}
        <View className="flex-row items-center justify-between">
          <Text className="text-white text-[22px] font-medium tracking-[2px] font-mono">
            {showDetails ? cardDetails.number : cardDetails.maskedNumber}
          </Text>
          {!showDetails && (
            <Copy size={16} color="rgba(255,255,255,0.6)" />
          )}
        </View>

        {/* Bottom Info */}
        <View className="flex-row justify-between items-end mt-auto pt-8">
          <View>
            <Text className="text-white/70 text-[10px] uppercase mb-1">
              Titulaire
            </Text>
            <Text className="text-white font-medium text-sm">
              {cardDetails.holder}
            </Text>
          </View>
          <View>
            <Text className="text-white/70 text-[10px] uppercase mb-1">
              Expire
            </Text>
            <Text className="text-white font-medium text-sm">
              {cardDetails.expiry}
            </Text>
          </View>
          <View>
            <Text className="text-white/70 text-[10px] uppercase mb-1">
              CVV
            </Text>
            <Text className="text-white font-medium text-sm">
              {showDetails ? cardDetails.cvv : '***'}
            </Text>
          </View>
        </View>

        {/* Locked Overlay */}
        {isLocked && (
          <View className="absolute inset-0 items-center justify-center bg-black/10 rounded-[20px]">
            <View className="bg-white/20 p-4 rounded-full">
              <Lock size={32} color="white" />
            </View>
            <Text className="text-white font-bold mt-2 text-lg">
              VERROUILLÉE
            </Text>
          </View>
        )}

        {/* Countdown Timer */}
        {showDetails && countdown !== undefined && countdown > 0 && (
          <View className="absolute top-4 right-4 bg-black/20 px-2 py-1 rounded-md">
            <Text className="text-white text-xs font-mono">{countdown}s</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export default VirtualCard;
