import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import SafeArea from "../../components/SafeArea";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import ItemRow from "../../components/ItemRow";
import CTAButton from "../../components/CTAButton";
import HighlightGlow from "../../components/HighlightGlow";
import { useAuthContext } from "../../src/providers/AuthProvider";
import { useDigest } from "../../src/hooks/useDigest";

function formatViews(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

function platformIcon(p: string): string {
  switch (p) {
    case "instagram": return "📸";
    case "youtube": return "▶️";
    case "reddit": return "💬";
    case "twitter": return "🐦";
    case "tiktok": return "🎵";
    default: return "📱";
  }
}

export default function DigestScreen() {
  const router = useRouter();
  const { profile } = useAuthContext();
  const marketCity = profile?.market_city || "Cape Coral";
  const marketState = profile?.market_state || "FL";
  const { content, loading, refresh } = useDigest(marketCity, marketState);

  if (loading && content.length === 0) {
    return (
      <SafeArea style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading your digest...</Text>
        </View>
      </SafeArea>
    );
  }

  const topAdaptation = content[0];

  return (
    <SafeArea style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#F97316" />
        }
      >
        <Text style={styles.title}>Your Daily Digest</Text>

        {/* Location + Streak */}
        <View style={styles.headerRow}>
          <Text style={styles.location}>{marketCity}, {marketState}</Text>
          <View style={styles.streakRow}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakNum}>12</Text>
            <Text style={styles.streakLabel}>day streak</Text>
          </View>
        </View>

        {/* Top Performing Content */}
        <HighlightGlow target="digest-reels-list">
        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>TOP PERFORMING CONTENT</Text>
            <Badge label="Today" variant="orange" />
          </View>
          {content.map((item, i) => (
            <TouchableOpacity
              key={item.url}
              onPress={() =>
                router.push({
                  pathname: "/adaptation/[url]",
                  params: { url: encodeURIComponent(item.url), title: item.title },
                })
              }
            >
              <ItemRow
                rightElement={
                  <View style={styles.engCol}>
                    <Text style={styles.viralIcon}>👾</Text>
                    <Text style={styles.viralScore}>{Math.round(item.engagementRate * 22)}</Text>
                  </View>
                }
              >
                <Text style={styles.reelTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.reelMeta}>
                  @{item.creatorHandle} · {formatViews(item.views || item.likes)} {item.views ? "views" : "likes"}
                </Text>
              </ItemRow>
            </TouchableOpacity>
          ))}
        </Card>
        </HighlightGlow>

        {/* Top Adaptation Preview */}
        {topAdaptation && (
          <Card>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>YOUR TOP ADAPTATION</Text>
              <Badge label="Ready" variant="green" />
            </View>
            <Text style={styles.adaptationText}>
              Hook: "Everyone's talking about {marketCity} flooding — here's what nobody tells you about the NEW construction zones..."
            </Text>
            <Text style={styles.adaptationMeta}>
              Based on: {topAdaptation.title} · Adapted for your audience
            </Text>
          </Card>
        )}

        <CTAButton
          label="See All 5 Adaptations"
          onPress={() => {
            if (topAdaptation) {
              router.push({
                pathname: "/adaptation/[url]",
                params: {
                  url: encodeURIComponent(topAdaptation.url),
                  title: topAdaptation.title,
                },
              });
            }
          }}
        />
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1923" },
  scroll: { flex: 1, paddingHorizontal: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: "#9CA3AF", fontSize: 14 },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 16 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  location: { fontSize: 13, color: "#9CA3AF" },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  streakIcon: { fontSize: 20 },
  streakNum: { fontSize: 18, fontWeight: "700", color: "#F97316" },
  streakLabel: { fontSize: 11, color: "#6B7280" },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  reelTitle: { fontSize: 14, fontWeight: "600", color: "#fff" },
  reelMeta: { fontSize: 11, color: "#6B7280", marginTop: 3 },
  engCol: { alignItems: "center", gap: 2 },
  viralIcon: { fontSize: 16 },
  viralScore: { color: "#4ADE80", fontSize: 14, fontWeight: "700" },
  adaptationText: { fontSize: 13, color: "#E5E7EB", lineHeight: 20 },
  adaptationMeta: { fontSize: 11, color: "#6B7280", marginTop: 8 },
});
