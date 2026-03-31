import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import SafeArea from "../../components/SafeArea";
import Card from "../../components/Card";
import ProgressBar from "../../components/ProgressBar";
import { useAuthContext } from "../../src/providers/AuthProvider";
import { useCoaching } from "../../src/hooks/useCoaching";
import { useStreak } from "../../src/hooks/useStreak";
import { useOnboarding } from "../../src/hooks/useOnboarding";

export default function ProfileScreen() {
  const { profile } = useAuthContext();
  const { progress } = useCoaching();
  const {
    currentStreak,
    longestStreak,
    freezesRemaining,
    milestones,
    nextMilestone,
    earnedBadges,
    unearnedBadges,
    loading,
    refresh,
  } = useStreak();
  const onboarding = useOnboarding();

  return (
    <SafeArea style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#F97316" />
        }
      >
        <Text style={styles.title}>Profile</Text>

        {/* ==================== USER INFO ==================== */}
        <Card>
          <View style={styles.profileRow}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarText}>
                {(profile?.full_name || "YN").split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{profile?.full_name || "Your Name"}</Text>
              <Text style={styles.userLocation}>{profile?.market_city || "Cape Coral"}, {profile?.market_state || "FL"}</Text>
              <Text style={styles.userRole}>Real Estate Agent · {profile?.experience_years || 8} years</Text>
            </View>
            <TouchableOpacity style={styles.editBtn}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* ==================== STREAK ==================== */}
        <Card borderLeftColor="#F97316">
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>YOUR STREAK</Text>
            <View style={styles.streakBadge}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakNum}>{currentStreak}</Text>
              <Text style={styles.streakLabel}>days</Text>
            </View>
          </View>
          <View style={styles.streakDetails}>
            <View style={styles.streakDetailItem}>
              <Text style={styles.streakDetailNum}>{longestStreak}</Text>
              <Text style={styles.streakDetailLabel}>Longest</Text>
            </View>
            <View style={styles.streakDetailItem}>
              <Text style={styles.streakDetailNum}>{freezesRemaining}</Text>
              <Text style={styles.streakDetailLabel}>Freezes Left</Text>
            </View>
            <View style={styles.streakDetailItem}>
              <Text style={styles.streakDetailNum}>
                {nextMilestone.days - currentStreak}
              </Text>
              <Text style={styles.streakDetailLabel}>To {nextMilestone.icon}</Text>
            </View>
          </View>

          {/* Milestone progress */}
          <View style={styles.milestoneRow}>
            {milestones.map((m) => (
              <View key={m.days} style={styles.milestoneItem}>
                <Text style={{ fontSize: 16, opacity: m.reached ? 1 : 0.3 }}>
                  {m.icon}
                </Text>
                <Text
                  style={[
                    styles.milestoneLabel,
                    m.reached && { color: "#E5E7EB" },
                  ]}
                >
                  {m.days}d
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* ==================== 90-DAY PROGRESS ==================== */}
        <Card>
          <Text style={[styles.cardTitle, { marginBottom: 12 }]}>
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
              <Text style={styles.statLabel}>Convos</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{progress.stats.totalAppointments}</Text>
              <Text style={styles.statLabel}>Appts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: "#4ADE80" }]}>
                {progress.stats.totalClosings}
              </Text>
              <Text style={styles.statLabel}>Closings</Text>
            </View>
          </View>
        </Card>

        {/* ==================== BADGES ==================== */}
        <Card>
          <Text style={[styles.cardTitle, { marginBottom: 12 }]}>
            BADGES ({earnedBadges.length}/{earnedBadges.length + unearnedBadges.length})
          </Text>

          {/* Earned */}
          <View style={styles.badgeGrid}>
            {earnedBadges.map((badge) => (
              <View key={badge.id} style={styles.badgeItem}>
                <Text style={styles.badgeIcon}>{badge.icon}</Text>
                <Text style={styles.badgeLabel}>{badge.label}</Text>
              </View>
            ))}
          </View>

          {/* Unearned */}
          {unearnedBadges.length > 0 && (
            <>
              <View style={styles.badgeDivider} />
              <Text style={styles.unearnedTitle}>UPCOMING</Text>
              <View style={styles.badgeGrid}>
                {unearnedBadges.map((badge) => (
                  <View key={badge.id} style={[styles.badgeItem, styles.badgeItemLocked]}>
                    <Text style={[styles.badgeIcon, { opacity: 0.3 }]}>
                      {badge.icon}
                    </Text>
                    <Text style={[styles.badgeLabel, { color: "#6B7280" }]}>
                      {badge.label}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </Card>

        {/* ==================== ONBOARDING (completed state) ==================== */}
        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>ONBOARDING</Text>
            <Text style={styles.onboardingStatus}>
              {onboarding.isComplete ? "✅ Complete" : `${onboarding.completedCount}/${onboarding.totalSteps}`}
            </Text>
          </View>
          <ProgressBar progress={onboarding.progress} color="#F97316" />
          <View style={{ marginTop: 10 }}>
            {onboarding.steps.map((step) => (
              <View key={step.key} style={styles.onboardingStep}>
                <Text style={{ fontSize: 14, opacity: step.completed ? 1 : 0.3 }}>
                  {step.completed ? "✅" : step.icon}
                </Text>
                <Text
                  style={[
                    styles.onboardingLabel,
                    step.completed && styles.onboardingLabelDone,
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* ==================== SETTINGS ==================== */}
        <Card>
          <Text style={[styles.cardTitle, { marginBottom: 8 }]}>SETTINGS</Text>
          {[
            "Market Area",
            "Content Style Preferences",
            "Notification Preferences",
            "Subscription & Billing",
            "Account",
          ].map((item) => (
            <TouchableOpacity key={item} style={styles.settingRow}>
              <Text style={styles.settingText}>{item}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
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
  profileRow: { flexDirection: "row", alignItems: "center", gap: 14 },
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
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2a3a4e",
  },
  editBtnText: { color: "#9CA3AF", fontSize: 12, fontWeight: "600" },
  // Streak
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  streakIcon: { fontSize: 20 },
  streakNum: { fontSize: 22, fontWeight: "700", color: "#F97316" },
  streakLabel: { fontSize: 12, color: "#6B7280" },
  streakDetails: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#2a3a4e",
  },
  streakDetailItem: { alignItems: "center" },
  streakDetailNum: { fontSize: 18, fontWeight: "700", color: "#fff" },
  streakDetailLabel: { fontSize: 10, color: "#6B7280", marginTop: 2 },
  milestoneRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#2a3a4e",
  },
  milestoneItem: { alignItems: "center", gap: 4 },
  milestoneLabel: { fontSize: 10, color: "#6B7280" },
  // Progress
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressDay: { fontSize: 13, color: "#9CA3AF" },
  progressPercent: { fontSize: 13, fontWeight: "600", color: "#4ADE80" },
  statsGrid: { flexDirection: "row", justifyContent: "space-around", marginTop: 14 },
  statItem: { alignItems: "center" },
  statNum: { fontSize: 18, fontWeight: "700", color: "#fff" },
  statLabel: { fontSize: 10, color: "#6B7280", marginTop: 2 },
  // Badges
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  badgeItem: { alignItems: "center", width: 70 },
  badgeItemLocked: { opacity: 0.5 },
  badgeIcon: { fontSize: 28 },
  badgeLabel: { fontSize: 10, color: "#E5E7EB", textAlign: "center", marginTop: 4 },
  badgeDivider: { height: 1, backgroundColor: "#2a3a4e", marginVertical: 12 },
  unearnedTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  // Onboarding
  onboardingStatus: { fontSize: 12, color: "#4ADE80", fontWeight: "600" },
  onboardingStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  onboardingLabel: { fontSize: 13, color: "#9CA3AF" },
  onboardingLabelDone: { color: "#E5E7EB", textDecorationLine: "line-through" },
  // Settings
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#2a3a4e",
  },
  settingText: { fontSize: 14, color: "#E5E7EB" },
  chevron: { fontSize: 18, color: "#6B7280" },
});
