import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import StatBox from "../../components/StatBox";
import ItemRow from "../../components/ItemRow";
import CTAButton from "../../components/CTAButton";

export default function TrackerScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Conversations</Text>

        {/* Stats Row */}
        <View style={styles.statRow}>
          <StatBox value={14} label="This Week" color="#F97316" />
          <StatBox value={47} label="This Month" color="#4ADE80" />
          <StatBox value={3} label="Appointments" color="#60A5FA" />
        </View>

        {/* Weekly Trend Bar Chart */}
        <Card>
          <Text style={styles.cardTitle}>WEEKLY TREND</Text>
          <View style={styles.barChart}>
            {[
              { day: "Mon", h: 30, active: false },
              { day: "Tue", h: 55, active: false },
              { day: "Wed", h: 45, active: false },
              { day: "Thu", h: 70, active: true },
              { day: "Fri", h: 60, active: false },
              { day: "Sat", h: 20, active: false },
              { day: "Sun", h: 10, active: false },
            ].map((bar) => (
              <View key={bar.day} style={styles.barCol}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: bar.h,
                      backgroundColor: bar.active ? "#F97316" : "#374151",
                    },
                  ]}
                />
                <Text style={styles.barLabel}>{bar.day}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Recent Conversations */}
        <Card>
          <Text style={[styles.cardTitle, { marginBottom: 8 }]}>
            RECENT CONVERSATIONS
          </Text>
          <ItemRow rightElement={<Badge label="Appointment Set" variant="green" />}>
            <Text style={styles.contactName}>Maria G.</Text>
            <Text style={styles.contactMeta}>
              Cape Coral flooding Reel · 2h ago
            </Text>
          </ItemRow>
          <ItemRow rightElement={<Badge label="In Conversation" variant="blue" />}>
            <Text style={styles.contactName}>David R.</Text>
            <Text style={styles.contactMeta}>
              $400K neighborhoods Short · 5h ago
            </Text>
          </ItemRow>
          <ItemRow rightElement={<Badge label="DM Received" variant="orange" />}>
            <Text style={styles.contactName}>Jennifer T.</Text>
            <Text style={styles.contactMeta}>
              Insurance hack Reel · Yesterday
            </Text>
          </ItemRow>
          <ItemRow rightElement={<Badge label="Follow-up Needed" variant="red" />}>
            <Text style={styles.contactName}>Mike S.</Text>
            <Text style={styles.contactMeta}>
              New construction Reel · 2 days ago
            </Text>
          </ItemRow>
        </Card>

        <CTAButton label="+ Log New Conversation" onPress={() => {}} />
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1923" },
  scroll: { flex: 1, paddingHorizontal: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 16 },
  statRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    height: 100,
    marginTop: 10,
  },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  bar: { width: "100%", borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 9, color: "#6B7280" },
  contactName: { fontSize: 14, fontWeight: "600", color: "#fff" },
  contactMeta: { fontSize: 11, color: "#6B7280", marginTop: 3 },
});
