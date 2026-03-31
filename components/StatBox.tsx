import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatBoxProps {
  value: string | number;
  label: string;
  color?: string;
}

export default function StatBox({ value, label, color }: StatBoxProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.value, color ? { color } : undefined]}>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F1923',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    flex: 1,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  label: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },
});
