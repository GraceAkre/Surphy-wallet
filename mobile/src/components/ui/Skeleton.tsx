import React, { useEffect, useRef } from 'react';
import { View, Animated, ViewStyle } from 'react-native';

/**
 * Skeleton Component
 * Loading placeholder with shimmer animation
 */

type SkeletonVariant = 'text' | 'circle' | 'rect' | 'card';

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: ViewStyle;
}

const VARIANT_DEFAULTS = {
  text: { height: 16, borderRadius: 4 },
  circle: { width: 40, height: 40, borderRadius: 20 },
  rect: { height: 100, borderRadius: 8 },
  card: { height: 120, borderRadius: 16 },
};

export function Skeleton({
  variant = 'rect',
  width,
  height,
  className = '',
  style,
}: SkeletonProps) {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    shimmerAnimation.start();

    return () => shimmerAnimation.stop();
  }, [shimmerValue]);

  const opacity = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const defaults = VARIANT_DEFAULTS[variant];

  const computedStyle: ViewStyle = {
    width: width || defaults.width || '100%',
    height: height || defaults.height,
    borderRadius: defaults.borderRadius,
  };

  return (
    <Animated.View
      className={`bg-separator-opaque ${className}`}
      style={[computedStyle, { opacity }, style]}
    />
  );
}

// Preset skeletons for common use cases
export function TextSkeleton({ lines = 1, lastLineWidth = '60%' }: { lines?: number; lastLineWidth?: string }) {
  return (
    <View className="gap-2">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={index === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </View>
  );
}

export function AvatarSkeleton({ size = 40 }: { size?: number }) {
  return <Skeleton variant="circle" width={size} height={size} />;
}

export function CardSkeleton() {
  return (
    <View className="bg-white rounded-2xl p-4 gap-3">
      <View className="flex-row items-center gap-3">
        <AvatarSkeleton />
        <View className="flex-1 gap-2">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" height={12} />
        </View>
      </View>
      <Skeleton variant="rect" height={60} />
    </View>
  );
}

export default Skeleton;
