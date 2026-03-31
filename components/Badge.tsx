import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type BadgeVariant = 'orange' | 'green' | 'blue' | 'red';

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  orange: { bg: 'rgba(249,115,22,0.15)', text: '#F97316' },
  green: { bg: 'rgba(74,222,128,0.15)', text: '#4ADE80' },
  blue: { bg: 'rgba(96,165,250,0.15)', text: '#60A5FA' },
  red: { bg: 'rgba(248,113,113,0.15)', text: '#F87171' },
};

export default function Badge({ label, variant }: BadgeProps) {
  const colors = VARIANT_STYLES[variant];

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
