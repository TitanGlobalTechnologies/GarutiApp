import React from "react";
import { View, Platform, ViewStyle, StyleProp } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface SafeAreaProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Array<"top" | "bottom" | "left" | "right">;
}

export default function SafeArea({ children, style, edges }: SafeAreaProps) {
  if (Platform.OS === "web") {
    return <View style={[{ flex: 1 }, style]}>{children}</View>;
  }
  return (
    <SafeAreaView style={style} edges={edges}>
      {children}
    </SafeAreaView>
  );
}
