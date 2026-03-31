import { View, Text, StyleSheet, ScrollView } from "react-native";
import SafeArea from "../../components/SafeArea";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import ItemRow from "../../components/ItemRow";
import CTAButton from "../../components/CTAButton";

export default function DigestScreen() {
  return (
    <SafeArea style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Your Daily Digest</Text>

        {/* Location + Streak */}
        <View style={styles.headerRow}>
          <Text style={styles.location}>Cape Coral, FL</Text>
          <View style={styles.streakRow}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakNum}>12</Text>
            <Text style={styles.streakLabel}>day streak</Text>
          </View>
        </View>

        {/* Top Performing Reels */}
        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>TOP PERFORMING REELS</Text>
            <Badge label="Today" variant="orange" />
          </View>
          <ItemRow
            rightElement={
              <Text style={styles.engRate}>4.2%</Text>
            }
          >
            <Text style={styles.reelTitle}>
              "Stop buying in Cape Coral until..."
            </Text>
            <Text style={styles.reelMeta}>
              @suncoast_realtor · 48.2K views
            </Text>
          </ItemRow>
          <ItemRow
            rightElement={
              <Text style={styles.engRate}>3.8%</Text>
            }
          >
            <Text style={styles.reelTitle}>
              "3 neighborhoods under $400K"
            </Text>
            <Text style={styles.reelMeta}>
              @capecorallife · 31.7K views
            </Text>
          </ItemRow>
          <ItemRow
            rightElement={
              <Text style={styles.engRate}>3.5%</Text>
            }
          >
            <Text style={styles.reelTitle}>
              "Insurance hack every FL buyer needs"
            </Text>
            <Text style={styles.reelMeta}>
              @fl_homes_daily · 27.1K views
            </Text>
          </ItemRow>
        </Card>

        {/* Top Adaptation */}
        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>YOUR TOP ADAPTATION</Text>
            <Badge label="Ready" variant="green" />
          </View>
          <Text style={styles.adaptationText}>
            Hook: "Everyone's talking about Cape Coral flooding — here's what
            nobody tells you about the NEW construction zones..."
          </Text>
          <Text style={styles.adaptationMeta}>
            Based on: "Stop buying in Cape Coral until..." · Adapted for your
            audience
          </Text>
        </Card>

        <CTAButton label="See All 5 Adaptations" onPress={() => {}} />
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1923" },
  scroll: { flex: 1, paddingHorizontal: 16 },
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
  engRate: { color: "#4ADE80", fontSize: 13, fontWeight: "600" },
  adaptationText: {
    fontSize: 13,
    color: "#E5E7EB",
    lineHeight: 20,
  },
  adaptationMeta: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 8,
  },
});
