import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  borderLeftColor?: string;
}

export default function Card({ children, style, borderLeftColor }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        borderLeftColor ? { borderLeftWidth: 4, borderLeftColor } : undefined,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a2636',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
});
