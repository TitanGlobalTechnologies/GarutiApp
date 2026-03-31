import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import SafeArea from "../../components/SafeArea";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import StatBox from "../../components/StatBox";
import ItemRow from "../../components/ItemRow";
import CTAButton from "../../components/CTAButton";
import HighlightGlow from "../../components/HighlightGlow";
import { useConversationsContext } from "../../src/providers/ConversationsProvider";
import { STATUS_CONFIG, CHANNEL_ICONS } from "../../src/data/mock-conversations";
import type { ConversationStatus } from "../../src/types/database";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export default function TrackerScreen() {
  const router = useRouter();
  const { conversations, stats, loading, refresh } = useConversationsContext();

  const maxBarHeight = 70;
  const maxCount = Math.max(...stats.weeklyTrend.map((d) => d.count), 1);

  return (
    <SafeArea style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#F97316" />
        }
      >
        <Text style={styles.title}>Conversations</Text>

        {/* Stats Row */}
        <View style={styles.statRow}>
          <StatBox value={stats.thisWeek} label="This Week" color="#F97316" />
          <StatBox value={stats.thisMonth} label="This Month" color="#4ADE80" />
          <StatBox value={stats.appointments} label="Appointments" color="#60A5FA" />
        </View>

        {/* Weekly Trend Bar Chart */}
        <Card>
          <Text style={styles.cardTitle}>WEEKLY TREND</Text>
          <View style={styles.barChart}>
            {stats.weeklyTrend.map((bar, i) => {
              const height = Math.max((bar.count / maxCount) * maxBarHeight, 4);
              const isToday = i === new Date().getDay() - 1; // Mon=0
              return (
                <View key={bar.day} style={styles.barCol}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height,
                        backgroundColor: isToday ? "#F97316" : "#374151",
                      },
                    ]}
                  />
                  <Text style={styles.barLabel}>{bar.day}</Text>
                  <Text style={styles.barCount}>{bar.count}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Pipeline Summary */}
        <Card>
          <Text style={[styles.cardTitle, { marginBottom: 12 }]}>PIPELINE</Text>
          <View style={styles.pipelineRow}>
            {(["dm_received", "in_conversation", "appointment_set", "follow_up_needed"] as ConversationStatus[]).map(
              (status) => {
                const config = STATUS_CONFIG[status];
                const count = conversations.filter((c) => c.status === status).length;
                return (
                  <View key={status} style={styles.pipelineItem}>
                    <Text style={[styles.pipelineNum, { color: getStatusColor(config.variant) }]}>
                      {count}
                    </Text>
                    <Text style={styles.pipelineLabel} numberOfLines={2}>
                      {config.label}
                    </Text>
                  </View>
                );
              }
            )}
          </View>
        </Card>

        {/* Recent Conversations */}
        <Card>
          <Text style={[styles.cardTitle, { marginBottom: 8 }]}>RECENT CONVERSATIONS</Text>
          {conversations.slice(0, 6).map((convo) => {
            const config = STATUS_CONFIG[convo.status];
            const channelIcon = CHANNEL_ICONS[convo.channel];
            return (
              <TouchableOpacity
                key={convo.id}
                onPress={() =>
                  router.push({
                    pathname: "/conversation/[id]",
                    params: { id: convo.id },
                  })
                }
              >
                <ItemRow
                  rightElement={<Badge label={config.label} variant={config.variant} />}
                >
                  <View style={styles.contactRow}>
                    <Text style={styles.channelIcon}>{channelIcon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contactName}>{convo.contact_name}</Text>
                      <Text style={styles.contactMeta} numberOfLines={1}>
                        {convo.notes || "No notes"} · {timeAgo(convo.last_activity_at)}
                      </Text>
                    </View>
                  </View>
                </ItemRow>
              </TouchableOpacity>
            );
          })}
        </Card>

        <HighlightGlow target="tracker-log-button">
          <CTAButton
            label="+ Log New Conversation"
            onPress={() => router.push("/conversation/new")}
          />
        </HighlightGlow>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeArea>
  );
}

function getStatusColor(variant: string): string {
  switch (variant) {
    case "orange": return "#F97316";
    case "green": return "#4ADE80";
    case "blue": return "#60A5FA";
    case "red": return "#F87171";
    default: return "#9CA3AF";
  }
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
  bar: {
    width: "100%",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 4,
  },
  barLabel: { fontSize: 9, color: "#6B7280" },
  barCount: { fontSize: 10, color: "#9CA3AF", fontWeight: "600" },
  pipelineRow: { flexDirection: "row", justifyContent: "space-between" },
  pipelineItem: { alignItems: "center", flex: 1 },
  pipelineNum: { fontSize: 22, fontWeight: "700" },
  pipelineLabel: { fontSize: 10, color: "#6B7280", textAlign: "center", marginTop: 2 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  channelIcon: { fontSize: 18 },
  contactName: { fontSize: 14, fontWeight: "600", color: "#fff" },
  contactMeta: { fontSize: 11, color: "#6B7280", marginTop: 2 },
});
