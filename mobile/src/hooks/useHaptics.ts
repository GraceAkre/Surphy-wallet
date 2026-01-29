import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Custom hook for haptic feedback
 * Provides consistent haptic patterns across the app
 */

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

export function useHaptics() {
  /**
   * Trigger haptic feedback
   * @param type - Type of haptic feedback
   */
  const trigger = useCallback(async (type: HapticType = 'light') => {
    // Skip on Android if not supported
    if (Platform.OS === 'android') {
      // Android haptics are less reliable, use sparingly
      try {
        switch (type) {
          case 'light':
          case 'selection':
            await Haptics.selectionAsync();
            break;
          case 'medium':
          case 'success':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            break;
          case 'heavy':
          case 'warning':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            break;
          case 'error':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            break;
        }
      } catch {
        // Haptics not available, fail silently
      }
      return;
    }

    // iOS haptics
    try {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'selection':
          await Haptics.selectionAsync();
          break;
      }
    } catch {
      // Haptics not available, fail silently
    }
  }, []);

  /**
   * Convenience methods for common haptic patterns
   */
  const light = useCallback(() => trigger('light'), [trigger]);
  const medium = useCallback(() => trigger('medium'), [trigger]);
  const heavy = useCallback(() => trigger('heavy'), [trigger]);
  const success = useCallback(() => trigger('success'), [trigger]);
  const warning = useCallback(() => trigger('warning'), [trigger]);
  const error = useCallback(() => trigger('error'), [trigger]);
  const selection = useCallback(() => trigger('selection'), [trigger]);

  return {
    trigger,
    light,
    medium,
    heavy,
    success,
    warning,
    error,
    selection,
  };
}

export default useHaptics;
