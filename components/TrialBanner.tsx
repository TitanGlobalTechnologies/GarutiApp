import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

interface TrialBannerProps {
  daysRemaining: number;
  visible: boolean;
}

export default function TrialBanner({ daysRemaining, visible }: TrialBannerProps) {
  const router = useRouter();

  if (!visible || daysRemaining <= 0) return null;

  const urgent = daysRemaining <= 3;

  return (
    <TouchableOpacity
      style={[styles.banner, urgent && styles.bannerUrgent]}
      onPress={() => router.push("/subscription/pricing")}
    >
      <Text style={styles.text}>
        {urgent ? "⚠️" : "🕐"} {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left in trial
      </Text>
      <Text style={styles.cta}>Choose Plan →</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(249,115,22,0.15)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  bannerUrgent: {
    backgroundColor: "rgba(248,113,113,0.15)",
  },
  text: { color: "#F97316", fontSize: 13, fontWeight: "600" },
  cta: { color: "#F97316", fontSize: 12, fontWeight: "700" },
});
