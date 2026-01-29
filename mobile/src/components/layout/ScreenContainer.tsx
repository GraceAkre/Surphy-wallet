import React from 'react';
import { View, ScrollView, RefreshControl, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';

/**
 * ScreenContainer Component
 * Base container for all screens with SafeArea and optional scrolling
 */

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Edge[];
  contentContainerStyle?: ViewStyle;
  className?: string;
  headerComponent?: React.ReactNode;
  stickyHeader?: boolean;
}

export function ScreenContainer({
  children,
  scrollable = true,
  refreshing = false,
  onRefresh,
  edges = ['top'],
  contentContainerStyle,
  className = '',
  headerComponent,
  stickyHeader = false,
}: ScreenContainerProps) {
  const bgColor = 'bg-background';

  // Non-scrollable container
  if (!scrollable) {
    return (
      <View className={`flex-1 ${bgColor}`}>
        <SafeAreaView edges={edges} className={`flex-1 ${className}`}>
          {headerComponent}
          {children}
        </SafeAreaView>
      </View>
    );
  }

  // Scrollable container with optional sticky header
  return (
    <View className={`flex-1 ${bgColor}`}>
      {/* Sticky Header outside ScrollView */}
      {stickyHeader && headerComponent && (
        <SafeAreaView edges={['top']} className={bgColor}>
          {headerComponent}
        </SafeAreaView>
      )}

      <ScrollView
        className={`flex-1 ${className}`}
        contentContainerStyle={[
          { paddingBottom: 100 },
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
              colors={['#3B82F6']}
            />
          ) : undefined
        }
      >
        {/* Header inside ScrollView (non-sticky) */}
        {!stickyHeader && headerComponent && (
          <SafeAreaView edges={['top']}>
            {headerComponent}
          </SafeAreaView>
        )}
        {stickyHeader ? children : (
          <SafeAreaView edges={edges.filter(e => e !== 'top')}>
            {children}
          </SafeAreaView>
        )}
      </ScrollView>
    </View>
  );
}

export default ScreenContainer;
