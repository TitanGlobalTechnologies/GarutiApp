import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import SafeArea from "../../components/SafeArea";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import ProgressBar from "../../components/ProgressBar";
import StepItem from "../../components/StepItem";
import { useWeeklyFocus } from "../../src/hooks/useWeeklyFocus";
import { useCoaching } from "../../src/hooks/useCoaching";

export default function FocusScreen() {
  const { focus, loading, toggleAction, completedActions, totalActions, actionProgress, refresh } =
    useWeeklyFocus();
  const { progress } = useCoaching();

  return (
    <SafeArea style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#F97316" />
        }
      >
        <Text style={styles.title}>This Week's Focus</Text>

        {/* AI-Personalized Priority */}
        <Card borderLeftColor="#60A5FA">
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>AI-PERSONALIZED PRIORITY</Text>
            <Badge label={`Week ${focus.weekNumber}`} variant="blue" />
          </View>
          <Text style={styles.focusTitle}>{focus.focusTitle}</Text>
          <Text style={styles.focusDesc}>{focus.focusDescription}</Text>
        </Card>

        {/* This Week's Actions */}
        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>THIS WEEK'S ACTIONS</Text>
            <Text style={styles.actionCount}>
              {completedActions}/{totalActions}
            </Text>
          </View>
          <ProgressBar progress={actionProgress} color="#F97316" />
          <View style={{ height: 12 }} />
          {focus.actions.map((action, i) => (
            <TouchableOpacity key={i} onPress={() => toggleAction(i)}>
              <StepItem
                title={action.title}
                description={action.description}
                status={action.completed ? "done" : i === focus.actions.findIndex((a) => !a.completed) ? "current" : "pending"}
                stepNumber={i + 1}
              />
            </TouchableOpacity>
          ))}
        </Card>

        {/* AI Insight */}
        <Card borderLeftColor="#FBBF24">
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>AI INSIGHT</Text>
            <Text style={styles.aiIcon}>🤖</Text>
          </View>
          <Text style={styles.insightText}>{focus.aiInsight}</Text>
          <Text style={styles.insightMeta}>
            Generated from your tracker data · Updated weekly
          </Text>
        </Card>

        {/* 90-Day Authority Progress */}
        <Card>
          <Text style={[styles.cardTitle, { marginBottom: 8 }]}>
            90-DAY AUTHORITY PROGRESS
          </Text>
          <View style={styles.progressHeader}>
            <Text style={styles.progressDay}>
              Day {progress.currentDay} of {progress.totalDays}
            </Text>
            <Text style={styles.progressPercent}>
              {Math.round((progress.currentDay / progress.totalDays) * 100)}%
            </Text>
          </View>
          <ProgressBar
            progress={progress.currentDay / progress.totalDays}
            color="#4ADE80"
          />
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{progress.stats.totalPosts}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{progress.stats.totalConversations}</Text>
              <Text style={styles.statLabel}>Conversations</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{progress.stats.totalAppointments}</Text>
              <Text style={styles.statLabel}>Appointments</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: "#4ADE80" }]}>
                {progress.stats.totalClosings}
              </Text>
              <Text style={styles.statLabel}>Closings</Text>
            </View>
          </View>
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
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 10,
  },
  cardTitle: {
    fontSize: 13, fontWeight: "600", color: "#9CA3AF",
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  focusTitle: { fontSize: 18, fontWeight: "700", color: "#60A5FA", marginBottom: 6 },
  focusDesc: { fontSize: 13, color: "#9CA3AF", lineHeight: 20 },
  actionCount: { fontSize: 13, fontWeight: "600", color: "#F97316" },
  aiIcon: { fontSize: 18 },
  insightText: { fontSize: 13, color: "#E5E7EB", lineHeight: 20 },
  insightMeta: { fontSize: 11, color: "#6B7280", marginTop: 8, fontStyle: "italic" },
  progressHeader: {
    flexDirection: "row", justifyContent: "space-between", marginBottom: 6,
  },
  progressDay: { fontSize: 13, color: "#9CA3AF" },
  progressPercent: { fontSize: 13, fontWeight: "600", color: "#4ADE80" },
  statsGrid: { flexDirection: "row", justifyContent: "space-around", marginTop: 14 },
  statItem: { alignItems: "center" },
  statNum: { fontSize: 18, fontWeight: "700", color: "#fff" },
  statLabel: { fontSize: 10, color: "#6B7280", marginTop: 2 },
});
