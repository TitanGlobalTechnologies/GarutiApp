import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface ScreenTitleProps {
  title: string;
}

export default function ScreenTitle({ title }: ScreenTitleProps) {
  return <Text style={styles.title}>{title}</Text>;
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
});
