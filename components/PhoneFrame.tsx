import React, { useRef, useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";

interface PhoneFrameProps {
  children: React.ReactNode;
}

const MIN_WIDTH = 320;
const MIN_HEIGHT = 580;
const DEFAULT_WIDTH = 390;
const DEFAULT_HEIGHT = 844;

export default function PhoneFrame({ children }: PhoneFrameProps) {
  // All hooks must be called before any conditional return
  const [isMobile, setIsMobile] = useState(false);
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const dragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const onMouseDown = useCallback(
    (e: any) => {
      e.preventDefault();
      dragging.current = true;
      startPos.current = { x: e.clientX, y: e.clientY, w: size.width, h: size.height };

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const newW = Math.max(MIN_WIDTH, startPos.current.w + (ev.clientX - startPos.current.x));
        const newH = Math.max(MIN_HEIGHT, startPos.current.h + (ev.clientY - startPos.current.y));
        setSize({ width: newW, height: newH });
      };

      const onMouseUp = () => {
        dragging.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [size]
  );

  // Not web — no frame
  if (Platform.OS !== "web") {
    return <>{children}</>;
  }

  // Mobile browser — full screen, no frame
  if (isMobile) {
    return <View style={styles.mobileContainer}>{children}</View>;
  }

  // Desktop — phone mockup with resize
  return (
    <View style={styles.backdrop}>
      <Text style={styles.heading}>Local Authority Engine</Text>
      <Text style={styles.subheading}>Interactive Mobile Preview</Text>

      <View
        style={[
          styles.phone,
          { width: size.width, height: size.height } as any,
        ]}
      >
        <View style={styles.notch} />
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>9:41</Text>
          <Text style={styles.statusText}>5G   87%</Text>
        </View>
        <View style={styles.screen}>{children}</View>
      </View>

      <View
        style={styles.resizeHandle}
        // @ts-ignore
        onMouseDown={onMouseDown}
      >
        <Text style={styles.resizeIcon}>⤡</Text>
        <Text style={styles.resizeLabel}>Drag to resize</Text>
      </View>

      <Text style={styles.dimensions}>
        {Math.round(size.width)} × {Math.round(size.height)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mobileContainer: {
    flex: 1,
    backgroundColor: "#0F1923",
    // @ts-ignore web
    height: "100vh",
    // @ts-ignore web
    overflow: "auto",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    // @ts-ignore web
    minHeight: "100vh",
    // @ts-ignore web
    userSelect: "none",
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
    textAlign: "center",
  },
  subheading: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 24,
    textAlign: "center",
  },
  phone: {
    backgroundColor: "#000",
    borderRadius: 44,
    borderWidth: 3,
    borderColor: "#333",
    // @ts-ignore web
    overflow: "hidden",
    position: "relative",
    // @ts-ignore web
    boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
  },
  notch: {
    position: "absolute",
    top: 0,
    alignSelf: "center",
    width: 150,
    height: 34,
    backgroundColor: "#000",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 20,
    // @ts-ignore web
    left: "50%",
    // @ts-ignore web
    transform: [{ translateX: -75 }],
  },
  statusBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    paddingHorizontal: 24,
    paddingTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    zIndex: 10,
    backgroundColor: "#0F1923",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  screen: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0F1923",
    // @ts-ignore web
    overflow: "auto",
  },
  resizeHandle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#1F2937",
    borderRadius: 20,
    // @ts-ignore web
    cursor: "nwse-resize",
  },
  resizeIcon: {
    fontSize: 16,
    color: "#F97316",
  },
  resizeLabel: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  dimensions: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 8,
  },
});
