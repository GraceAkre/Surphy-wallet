import React from 'react';
import { View } from 'react-native';

/**
 * Divider Component
 * Horizontal line separator
 */

interface DividerProps {
  className?: string;
  color?: string;
}

export function Divider({ className = '', color }: DividerProps) {
  return (
    <View
      className={`h-px bg-separator-opaque ${className}`}
      style={color ? { backgroundColor: color } : undefined}
    />
  );
}

export default Divider;
