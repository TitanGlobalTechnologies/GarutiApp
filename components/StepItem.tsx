import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type StepStatus = 'done' | 'current' | 'pending';

interface StepItemProps {
  title: string;
  description: string;
  status: StepStatus;
  stepNumber?: number;
}

const STATUS_COLORS: Record<StepStatus, { circle: string; text: string }> = {
  done: { circle: '#4ADE80', text: '#4ADE80' },
  current: { circle: '#F97316', text: '#F97316' },
  pending: { circle: '#6B7280', text: '#6B7280' },
};

export default function StepItem({
  title,
  description,
  status,
  stepNumber,
}: StepItemProps) {
  const colors = STATUS_COLORS[status];

  return (
    <View style={styles.row}>
      <View style={[styles.circle, { backgroundColor: colors.circle }]}>
        {status === 'done' ? (
          <Text style={styles.checkmark}>{'\u2713'}</Text>
        ) : (
          <Text style={styles.number}>{stepNumber ?? ''}</Text>
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  number: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
