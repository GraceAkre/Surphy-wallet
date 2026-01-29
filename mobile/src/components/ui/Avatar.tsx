import React from 'react';
import { View, Text, Image, ImageSourcePropType } from 'react-native';
import { getInitials } from '../../utils/formatters';

/**
 * Avatar Component
 * User profile images with fallback initials
 */

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  size?: AvatarSize;
  imageUrl?: string | null;
  source?: ImageSourcePropType;
  name?: string | null;
  fallback?: string;
  showBadge?: boolean;
  badgeContent?: string;
}

const SIZE_STYLES = {
  xs: {
    container: 'w-6 h-6',
    text: 'text-caption2 font-bold',
    badge: 'w-3 h-3 text-[8px]',
  },
  sm: {
    container: 'w-8 h-8',
    text: 'text-caption1 font-bold',
    badge: 'w-4 h-4 text-[9px]',
  },
  md: {
    container: 'w-10 h-10',
    text: 'text-subheadline font-bold',
    badge: 'w-5 h-5 text-[10px]',
  },
  lg: {
    container: 'w-14 h-14',
    text: 'text-headline font-bold',
    badge: 'w-6 h-6 text-caption2',
  },
  xl: {
    container: 'w-20 h-20',
    text: 'text-title2 font-bold',
    badge: 'w-8 h-8 text-footnote',
  },
};

export function Avatar({
  size = 'md',
  imageUrl,
  source,
  name,
  fallback,
  showBadge = false,
  badgeContent,
}: AvatarProps) {
  const sizeStyle = SIZE_STYLES[size];
  const displayInitials = fallback || getInitials(name);

  const hasImage = imageUrl || source;

  return (
    <View className="relative">
      {/* Avatar Container */}
      <View
        className={`
          ${sizeStyle.container}
          rounded-full
          bg-primary-50
          items-center justify-center
          overflow-hidden
        `}
      >
        {hasImage ? (
          <Image
            source={source || { uri: imageUrl! }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <Text className={`${sizeStyle.text} text-primary`}>
            {displayInitials}
          </Text>
        )}
      </View>

      {/* Badge */}
      {showBadge && (
        <View
          className={`
            absolute -bottom-0 -right-0
            ${sizeStyle.badge}
            bg-primary rounded-lg
            border-2 border-white
            items-center justify-center
          `}
        >
          {badgeContent && (
            <Text className={`text-white font-bold ${sizeStyle.badge}`}>
              {badgeContent}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export default Avatar;
