import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { useRoutineHighlight, HighlightTarget } from "../src/providers/RoutineProvider";

interface HighlightGlowProps {
  target: HighlightTarget;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Wraps a section and shows an animated orange border glow
 * when the routine directs the user to this area.
 */
export default function HighlightGlow({ target, children, style }: HighlightGlowProps) {
  const { activeHighlight, clearHighlight } = useRoutineHighlight();
  const opacity = useRef(new Animated.Value(0)).current;
  const isActive = activeHighlight === target;

  useEffect(() => {
    if (isActive) {
      // Pulse animation: fade in → pulse twice → fade out
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start(() => clearHighlight());
    } else {
      opacity.setValue(0);
    }
  }, [isActive]);

  return (
    <Animated.View
      style={[
        style,
        isActive && styles.glowBorder,
        { borderColor: isActive ? `rgba(249,115,22,${1})` : "transparent" },
        // We animate the overlay opacity
      ]}
    >
      {children}
      {isActive && (
        <Animated.View
          style={[styles.overlay, { opacity }]}
          pointerEvents="none"
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glowBorder: {
    borderWidth: 2,
    borderRadius: 16,
    borderColor: "#F97316",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    backgroundColor: "rgba(249,115,22,0.08)",
  },
});
