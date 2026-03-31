import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Linking } from "react-native";
import SafeArea from "../../components/SafeArea";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import ProgressBar from "../../components/ProgressBar";
import ItemRow from "../../components/ItemRow";
import { useCoaching } from "../../src/hooks/useCoaching";
import { useStreak } from "../../src/hooks/useStreak";

export default function CoachScreen() {
  const {
    nextSession,
    pastSessions,
    currentWeek,
    daysUntilNextSession,
    podMembers,
    podName,
    progress,
    getCurriculum,
    loading,
    refresh,
  } = useCoaching();

  const { currentStreak } = useStreak();

  const curriculum = nextSession ? getCurriculum(nextSession.week_number) : null;

  return (
    <SafeArea style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#F97316" />
        }
      >
        <Text style={styles.title}>Coaching Home</Text>

        {/* ==================== NEXT SESSION ==================== */}
        {nextSession && (
          <Card borderLeftColor="#F97316">
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>NEXT SESSION</Text>
              <Badge
                label={daysUntilNextSession === 0 ? "Today!" : `In ${daysUntilNextSession} day${daysUntilNextSession !== 1 ? "s" : ""}`}
                variant="orange"
              />
            </View>
            <Text style={styles.sessionTitle}>{nextSession.title}</Text>
            <Text style={styles.sessionMeta}>
              {new Date(nextSession.session_date).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}{" "}
              · 12:00 PM ET
            </Text>
            <Text style={styles.sessionMeta}>
              Week {nextSession.week_number} of 12 · {nextSession.theme}
            </Text>
            <View style={styles.divider} />
            {nextSession.prep_instructions && (
              <Text style={styles.prepText}>
                Prep: {nextSession.prep_instructions}
              </Text>
            )}
            {nextSession.meeting_url && (
              <TouchableOpacity
                style={styles.joinBtn}
                onPress={() => Linking.openURL(nextSession.meeting_url!)}
              >
                <Text style={styles.joinBtnText}>Join Session →</Text>
              </TouchableOpacity>
            )}
          </Card>
        )}

        {/* ==================== 90-DAY GUARANTEE TRACKER ==================== */}
        <Card>
          <Text style={[styles.cardTitle, { marginBottom: 8 }]}>
            90-DAY GUARANTEE TRACKER
          </Text>
          <View style={styles.guaranteeRow}>
            <View style={styles.guaranteeLeft}>
              <Text style={styles.guaranteeNum}>{progress.stats.totalAppointments}</Text>
              <Text style={styles.guaranteeSub}> / {progress.targetAppointments} appointments</Text>
            </View>
            <Text style={styles.daysLeft}>
              {progress.totalDays - progress.currentDay} days left
            </Text>
          </View>
          <ProgressBar
            progress={progress.stats.totalAppointments / progress.targetAppointments}
            color="#4ADE80"
          />
          <Text style={styles.paceText}>{progress.paceMessage}</Text>

          {/* Milestone timeline */}
          <View style={styles.milestoneRow}>
            {progress.milestones.map((m) => (
              <View key={m.day} style={styles.milestoneItem}>
                <View
                  style={[
                    styles.milestoneDot,
                    m.reached
                      ? { backgroundColor: "#4ADE80" }
                      : { backgroundColor: "#2a3a4e" },
                  ]}
                />
                <Text style={[styles.milestoneLabel, m.reached && { color: "#E5E7EB" }]}>
                  {m.label}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* ==================== 90-DAY STATS ==================== */}
        <Card>
          <Text style={[styles.cardTitle, { marginBottom: 12 }]}>
            YOUR 90-DAY PROGRESS
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
            color="#60A5FA"
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

        {/* ==================== ACCOUNTABILITY POD ==================== */}
        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>YOUR ACCOUNTABILITY POD</Text>
            <Text style={styles.podName}>{podName}</Text>
          </View>
          {podMembers.map((member) => (
            <ItemRow key={member.id}>
              <View style={styles.podRow}>
                <View style={[styles.avatar, { backgroundColor: member.avatarColor }]}>
                  <Text style={styles.avatarText}>{member.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.podMemberName}>
                    {member.name} · {member.market}
                  </Text>
                  <Text style={styles.podMemberMeta}>
                    {member.lastPosted === "today" ? "Posted today" : `Last posted ${member.lastPosted}`}
                    {" · "}
                    {member.currentStreak}-day streak
                  </Text>
                </View>
                <View style={styles.podStats}>
                  <Text style={styles.podStatNum}>{member.totalPosts}</Text>
                  <Text style={styles.podStatLabel}>posts</Text>
                </View>
              </View>
            </ItemRow>
          ))}
        </Card>

        {/* ==================== PAST SESSIONS ==================== */}
        {pastSessions.length > 0 && (
          <Card>
            <Text style={[styles.cardTitle, { marginBottom: 8 }]}>
              PAST SESSIONS
            </Text>
            {pastSessions.slice(0, 4).map((session) => {
              const weekCurriculum = getCurriculum(session.week_number);
              return (
                <ItemRow
                  key={session.id}
                  rightElement={
                    session.recording_url ? (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(session.recording_url!)}
                      >
                        <Text style={styles.recordingLink}>Watch →</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.noRecording}>No recording</Text>
                    )
                  }
                >
                  <Text style={styles.pastSessionTitle}>
                    Week {session.week_number}: {session.theme}
                  </Text>
                  <Text style={styles.pastSessionMeta}>
                    {new Date(session.session_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                    {weekCurriculum ? ` · ${weekCurriculum.title}` : ""}
                  </Text>
                </ItemRow>
              );
            })}
          </Card>
        )}

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
  sessionTitle: { fontSize: 16, fontWeight: "700", color: "#fff", marginBottom: 4 },
  sessionMeta: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#2a3a4e", marginVertical: 10 },
  prepText: { fontSize: 12, color: "#6B7280" },
  joinBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#F97316",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  joinBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
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
  milestoneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#2a3a4e",
  },
  milestoneItem: { alignItems: "center", gap: 4 },
  milestoneDot: { width: 10, height: 10, borderRadius: 5 },
  milestoneLabel: { fontSize: 9, color: "#6B7280", textAlign: "center" },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressDay: { fontSize: 13, color: "#9CA3AF" },
  progressPercent: { fontSize: 13, fontWeight: "600", color: "#60A5FA" },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
  },
  statItem: { alignItems: "center" },
  statNum: { fontSize: 18, fontWeight: "700", color: "#fff" },
  statLabel: { fontSize: 10, color: "#6B7280", marginTop: 2 },
  podName: { fontSize: 11, color: "#6B7280" },
  podRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "700", fontSize: 13, color: "#fff" },
  podMemberName: { fontSize: 13, fontWeight: "600", color: "#fff" },
  podMemberMeta: { fontSize: 11, color: "#6B7280", marginTop: 1 },
  podStats: { alignItems: "center" },
  podStatNum: { fontSize: 16, fontWeight: "700", color: "#F97316" },
  podStatLabel: { fontSize: 9, color: "#6B7280" },
  recordingLink: { color: "#60A5FA", fontSize: 12, fontWeight: "600" },
  noRecording: { color: "#6B7280", fontSize: 11 },
  pastSessionTitle: { fontSize: 13, fontWeight: "600", color: "#E5E7EB" },
  pastSessionMeta: { fontSize: 11, color: "#6B7280", marginTop: 2 },
});
