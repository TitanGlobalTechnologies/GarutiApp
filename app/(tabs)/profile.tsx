import { View, Text, StyleSheet, ScrollView } from "react-native";
import SafeArea from "../../components/SafeArea";
import Card from "../../components/Card";
import ProgressBar from "../../components/ProgressBar";

export default function ProfileScreen() {
  return (
    <SafeArea style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profile</Text>

        {/* User Info */}
        <Card>
          <View style={styles.profileRow}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarText}>YN</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>Your Name</Text>
              <Text style={styles.userLocation}>Cape Coral, FL</Text>
              <Text style={styles.userRole}>Real Estate Agent</Text>
            </View>
          </View>
        </Card>

        {/* Stats Overview */}
        <Card>
          <Text style={[styles.cardTitle, { marginBottom: 12 }]}>
            90-DAY PROGRESS
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: "#F97316" }]}>42</Text>
              <Text style={styles.statLabel}>Day</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: "#4ADE80" }]}>38</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: "#60A5FA" }]}>47</Text>
              <Text style={styles.statLabel}>Convos</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: "#FBBF24" }]}>3</Text>
              <Text style={styles.statLabel}>Appts</Text>
            </View>
          </View>
          <View style={{ marginTop: 12 }}>
            <ProgressBar progress={0.47} color="#4ADE80" />
          </View>
        </Card>

        {/* Settings */}
        <Card>
          <Text style={[styles.cardTitle, { marginBottom: 8 }]}>SETTINGS</Text>
          {["Market Area", "Notification Preferences", "Content Style", "Account"].map(
            (item) => (
              <View key={item} style={styles.settingRow}>
                <Text style={styles.settingText}>{item}</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            )
          )}
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
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 20, fontWeight: "700", color: "#fff" },
  userName: { fontSize: 18, fontWeight: "700", color: "#fff" },
  userLocation: { fontSize: 13, color: "#9CA3AF", marginTop: 2 },
  userRole: { fontSize: 12, color: "#6B7280", marginTop: 1 },
  statsGrid: { flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center" },
  statNum: { fontSize: 22, fontWeight: "700" },
  statLabel: { fontSize: 10, color: "#6B7280", marginTop: 2 },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2a3a4e",
  },
  settingText: { fontSize: 14, color: "#E5E7EB" },
  chevron: { fontSize: 18, color: "#6B7280" },
});
