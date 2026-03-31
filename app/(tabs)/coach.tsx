import { View, Text, StyleSheet, ScrollView } from "react-native";
import SafeArea from "../../components/SafeArea";
import Card from "../../components/Card";
import ProgressBar from "../../components/ProgressBar";
import ItemRow from "../../components/ItemRow";

export default function CoachScreen() {
  return (
    <SafeArea style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Coaching Home</Text>

        {/* Next Session */}
        <Card borderLeftColor="#F97316">
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>NEXT SESSION</Text>
            <View style={styles.badgeOrange}>
              <Text style={styles.badgeText}>In 2 days</Text>
            </View>
          </View>
          <Text style={styles.sessionTitle}>Turning DMs Into Appointments</Text>
          <Text style={styles.sessionMeta}>
            Thursday, April 3 · 12:00 PM ET
          </Text>
          <Text style={styles.sessionMeta}>
            Week 6 of 12 · Led by Coach Sarah
          </Text>
          <View style={styles.divider} />
          <Text style={styles.prepText}>
            Prep: Bring your top 3 DM conversations from this week
          </Text>
        </Card>

        {/* 90-Day Guarantee Tracker */}
        <Card>
          <Text style={[styles.cardTitle, { marginBottom: 8 }]}>
            90-DAY GUARANTEE TRACKER
          </Text>
          <View style={styles.guaranteeRow}>
            <View style={styles.guaranteeLeft}>
              <Text style={styles.guaranteeNum}>3</Text>
              <Text style={styles.guaranteeSub}> / 10 appointments</Text>
            </View>
            <Text style={styles.daysLeft}>48 days left</Text>
          </View>
          <ProgressBar progress={0.3} color="#4ADE80" />
          <Text style={styles.paceText}>
            On track — agents at your pace average 8-12 by Day 90
          </Text>
        </Card>

        {/* Accountability Pod */}
        <Card>
          <Text style={[styles.cardTitle, { marginBottom: 8 }]}>
            YOUR ACCOUNTABILITY POD
          </Text>
          <ItemRow>
            <View style={styles.podRow}>
              <View style={[styles.avatar, { backgroundColor: "#F97316" }]}>
                <Text style={styles.avatarText}>JT</Text>
              </View>
              <View>
                <Text style={styles.podName}>Jessica T. · Austin, TX</Text>
                <Text style={styles.podMeta}>
                  Posted today · 15-day streak
                </Text>
              </View>
            </View>
          </ItemRow>
          <ItemRow>
            <View style={styles.podRow}>
              <View style={[styles.avatar, { backgroundColor: "#60A5FA" }]}>
                <Text style={styles.avatarText}>KR</Text>
              </View>
              <View>
                <Text style={styles.podName}>Kevin R. · Charlotte, NC</Text>
                <Text style={styles.podMeta}>
                  Posted today · 9-day streak
                </Text>
              </View>
            </View>
          </ItemRow>
          <ItemRow>
            <View style={styles.podRow}>
              <View style={[styles.avatar, { backgroundColor: "#4ADE80" }]}>
                <Text style={styles.avatarText}>AM</Text>
              </View>
              <View>
                <Text style={styles.podName}>Ashley M. · Tampa, FL</Text>
                <Text style={styles.podMeta}>
                  Last posted yesterday · 4-day streak
                </Text>
              </View>
            </View>
          </ItemRow>
        </Card>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1923" },
  scroll: { flex: 1, paddingHorizontal: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 16 },
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
  badgeOrange: {
    backgroundColor: "rgba(249,115,22,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: { color: "#F97316", fontSize: 11, fontWeight: "600" },
  sessionTitle: { fontSize: 16, fontWeight: "700", color: "#fff", marginBottom: 4 },
  sessionMeta: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#2a3a4e", marginVertical: 10 },
  prepText: { fontSize: 12, color: "#6B7280" },
  guaranteeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
  },
  guaranteeLeft: { flexDirection: "row", alignItems: "baseline" },
  guaranteeNum: { fontSize: 28, fontWeight: "700", color: "#4ADE80" },
  guaranteeSub: { fontSize: 14, color: "#6B7280" },
  daysLeft: { fontSize: 12, color: "#9CA3AF" },
  paceText: { fontSize: 11, color: "#6B7280", marginTop: 8 },
  podRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "700", fontSize: 13, color: "#fff" },
  podName: { fontSize: 13, fontWeight: "600", color: "#fff" },
  podMeta: { fontSize: 11, color: "#6B7280" },
});
