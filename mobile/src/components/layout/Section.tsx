import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

/**
 * Section Component
 * Content section with title and optional "See all" action
 */

interface SectionProps {
  children: React.ReactNode;
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  titleClassName?: string;
}

export function Section({
  children,
  title,
  actionLabel = 'Voir tout',
  onAction,
  className = '',
  titleClassName = '',
}: SectionProps) {
  return (
    <View className={`${className}`}>
      {/* Header */}
      {(title || onAction) && (
        <View className="flex-row justify-between items-center mb-3 px-1">
          {title && (
            <Text className={`text-title3 text-ink-primary ${titleClassName}`}>
              {title}
            </Text>
          )}
          {onAction && (
            <Pressable
              onPress={onAction}
              className="flex-row items-center"
              hitSlop={8}
            >
              <Text className="text-subheadline text-primary font-medium">
                {actionLabel}
              </Text>
              <ChevronRight size={16} color="#3B82F6" />
            </Pressable>
          )}
        </View>
      )}

      {/* Content */}
      {children}
    </View>
  );
}

export default Section;
