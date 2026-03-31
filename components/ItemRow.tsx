import React from 'react';
import { View, StyleSheet } from 'react-native';

interface ItemRowProps {
  children: React.ReactNode;
  rightElement?: React.ReactNode;
}

export default function ItemRow({ children, rightElement }: ItemRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>{children}</View>
      {rightElement && <View>{rightElement}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a3a4e',
  },
  left: {
    flex: 1,
  },
});
