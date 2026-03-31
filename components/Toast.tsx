import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, TouchableOpacity } from "react-native";

interface ToastProps {
  visible: boolean;
  message: string;
  type?: "success" | "error" | "info";
  onDismiss: () => void;
  duration?: number;
}

const COLORS = {
  success: { bg: "rgba(74,222,128,0.15)", border: "#4ADE80", text: "#4ADE80", icon: "✓" },
  error: { bg: "rgba(248,113,113,0.15)", border: "#F87171", text: "#F87171", icon: "✕" },
  info: { bg: "rgba(249,115,22,0.15)", border: "#F97316", text: "#F97316", icon: "ℹ" },
};

export default function Toast({ visible, message, type = "success", onDismiss, duration = 2500 }: ToastProps) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        dismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  function dismiss() {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -80, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }

  if (!visible) return null;

  const colors = COLORS[type];

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.bg, borderColor: colors.border, transform: [{ translateY }], opacity },
      ]}
    >
      <TouchableOpacity style={styles.inner} onPress={dismiss} activeOpacity={0.8}>
        <Text style={[styles.icon, { color: colors.text }]}>{colors.icon}</Text>
        <Text style={[styles.message, { color: colors.text }]} numberOfLines={2}>
          {message}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 8,
    left: 12,
    right: 12,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 9999,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  icon: { fontSize: 16, fontWeight: "700" },
  message: { fontSize: 14, fontWeight: "600", flex: 1, lineHeight: 19 },
});
