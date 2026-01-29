import { Platform, ViewStyle } from 'react-native';

/**
 * Shadow Utility - Consistent shadows across iOS and Android
 * Inspired by Apple's elevation system
 */

type ShadowLevel = 'none' | 'soft' | 'card' | 'elevated' | 'button' | 'modal';

interface ShadowConfig {
  ios: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
  };
  android: {
    elevation: number;
    shadowColor: string;
  };
}

const SHADOW_CONFIGS: Record<ShadowLevel, ShadowConfig> = {
  none: {
    ios: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0 },
    android: { elevation: 0, shadowColor: 'transparent' },
  },
  soft: {
    ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4 },
    android: { elevation: 2, shadowColor: '#000000' },
  },
  card: {
    ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
    android: { elevation: 3, shadowColor: '#000000' },
  },
  elevated: {
    ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24 },
    android: { elevation: 6, shadowColor: '#000000' },
  },
  button: {
    ios: { shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
    android: { elevation: 4, shadowColor: '#3B82F6' },
  },
  modal: {
    ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24 },
    android: { elevation: 10, shadowColor: '#000000' },
  },
};

/**
 * Get shadow style for a given level
 * @param level - Shadow intensity level
 * @param customColor - Optional custom shadow color (for colored buttons)
 */
export function shadow(level: ShadowLevel, customColor?: string): ViewStyle {
  const config = SHADOW_CONFIGS[level];

  return Platform.select({
    ios: {
      shadowColor: customColor || config.ios.shadowColor,
      shadowOffset: config.ios.shadowOffset,
      shadowOpacity: config.ios.shadowOpacity,
      shadowRadius: config.ios.shadowRadius,
    },
    android: {
      elevation: config.android.elevation,
      shadowColor: customColor || config.android.shadowColor,
    },
  }) as ViewStyle;
}

/**
 * Predefined shadow styles for quick access
 */
export const shadows = {
  none: shadow('none'),
  soft: shadow('soft'),
  card: shadow('card'),
  elevated: shadow('elevated'),
  button: shadow('button'),
  modal: shadow('modal'),

  // Colored button variants
  primaryButton: shadow('button', '#3B82F6'),
  successButton: shadow('button', '#34C759'),
  dangerButton: shadow('button', '#FF3B30'),
  warningButton: shadow('button', '#FF9500'),
};

export default shadow;
