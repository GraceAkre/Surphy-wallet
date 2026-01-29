import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Bell, ChevronLeft } from 'lucide-react-native';
import { Avatar } from '../ui/Avatar';
import { IconButton } from '../ui/IconButton';

/**
 * Header Component
 * Screen header with navigation and actions
 */

interface HeaderProps {
  // Navigation
  showBack?: boolean;
  onBack?: () => void;
  backLabel?: string;

  // Content
  title?: string;
  subtitle?: string;
  greeting?: string;
  userName?: string;

  // Right side
  showNotification?: boolean;
  hasUnreadNotifications?: boolean;
  onNotificationPress?: () => void;
  showAvatar?: boolean;
  avatarUrl?: string | null;
  avatarName?: string | null;
  onAvatarPress?: () => void;

  // Custom
  rightComponent?: React.ReactNode;
  className?: string;
}

export function Header({
  showBack = false,
  onBack,
  backLabel,
  title,
  subtitle,
  greeting,
  userName,
  showNotification = false,
  hasUnreadNotifications = false,
  onNotificationPress,
  showAvatar = false,
  avatarUrl,
  avatarName,
  onAvatarPress,
  rightComponent,
  className = '',
}: HeaderProps) {
  // Render back button or greeting
  const renderLeft = () => {
    if (showBack) {
      return (
        <Pressable onPress={onBack} className="flex-row items-center py-2 -ml-2">
          <ChevronLeft size={28} color="#1D1D1F" />
          {backLabel && (
            <Text className="text-body text-primary font-medium">{backLabel}</Text>
          )}
        </Pressable>
      );
    }

    if (greeting || title) {
      return (
        <View>
          {greeting && (
            <Text className="text-subheadline text-ink-secondary font-medium">
              {greeting}
            </Text>
          )}
          {userName && (
            <Text className="text-title1 text-ink-primary">
              {userName}
            </Text>
          )}
          {title && !greeting && (
            <Text className="text-largeTitle text-ink-primary">
              {title}
            </Text>
          )}
          {subtitle && (
            <Text className="text-subheadline text-ink-secondary mt-0.5">
              {subtitle}
            </Text>
          )}
        </View>
      );
    }

    return null;
  };

  // Render right side actions
  const renderRight = () => {
    if (rightComponent) {
      return rightComponent;
    }

    return (
      <View className="flex-row items-center gap-3">
        {showNotification && (
          <View className="relative">
            <IconButton
              icon={Bell}
              variant="outlined"
              onPress={onNotificationPress}
            />
            {hasUnreadNotifications && (
              <View className="absolute top-1 right-1 w-2.5 h-2.5 bg-danger rounded-full border-2 border-white" />
            )}
          </View>
        )}

        {showAvatar && (
          <Pressable onPress={onAvatarPress}>
            <Avatar
              size="md"
              imageUrl={avatarUrl}
              name={avatarName}
            />
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View className={`flex-row justify-between items-center px-screen py-4 ${className}`}>
      <View className="flex-1">{renderLeft()}</View>
      {renderRight()}
    </View>
  );
}

export default Header;
