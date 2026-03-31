import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from "react-native";
import { useRouter } from "expo-router";
import SafeArea from "../../components/SafeArea";
import Card from "../../components/Card";
import { useNotifications } from "../../src/hooks/useNotifications";

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onToggle: (val: boolean) => void;
}

function ToggleRow({ label, description, value, onToggle }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#2a3a4e", true: "#F97316" }}
        thumbColor="#fff"
      />
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { preferences, updatePreference, pushPermission, requestPushPermission } = useNotifications();

  return (
    <SafeArea style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>
          Control which notifications you receive. We'll never spam you — every notification is designed to help you post consistently and close more deals.
        </Text>

        {pushPermission !== "granted" && (
          <Card borderLeftColor="#F97316">
            <Text style={styles.permissionTitle}>Enable Push Notifications</Text>
            <Text style={styles.permissionDesc}>
              Get your daily digest alert, streak reminders, and coaching session notifications.
            </Text>
            <TouchableOpacity style={styles.enableBtn} onPress={requestPushPermission}>
              <Text style={styles.enableBtnText}>Enable Notifications</Text>
            </TouchableOpacity>
          </Card>
        )}

        <Card>
          <Text style={styles.sectionTitle}>DAILY CONTENT</Text>
          <ToggleRow
            label="Daily Digest Alert"
            description="Get notified when your morning digest is ready"
            value={preferences.dailyDigest}
            onToggle={(v) => updatePreference("dailyDigest", v)}
          />
          <ToggleRow
            label="Streak Reminder"
            description="Reminder to post before your streak breaks"
            value={preferences.streakReminder}
            onToggle={(v) => updatePreference("streakReminder", v)}
          />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>COACHING</Text>
          <ToggleRow
            label="Session Reminders"
            description="1 hour before each live coaching session"
            value={preferences.coachingReminder}
            onToggle={(v) => updatePreference("coachingReminder", v)}
          />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>CONVERSATIONS</Text>
          <ToggleRow
            label="Follow-up Reminders"
            description="When a conversation has no activity for 48+ hours"
            value={preferences.conversationFollowUp}
            onToggle={(v) => updatePreference("conversationFollowUp", v)}
          />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <ToggleRow
            label="Trial & Billing Alerts"
            description="Trial ending reminders, payment confirmations"
            value={preferences.trialEnding}
            onToggle={(v) => updatePreference("trialEnding", v)}
          />
          <ToggleRow
            label="Weekly Progress Report"
            description="Email summary of your posts, conversations, and appointments"
            value={preferences.weeklyReport}
            onToggle={(v) => updatePreference("weeklyReport", v)}
          />
        </Card>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1923" },
  scroll: { flex: 1, paddingHorizontal: 16 },
  backBtn: { color: "#9CA3AF", fontSize: 14, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#9CA3AF", lineHeight: 18, marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#2a3a4e" },
  toggleLabel: { fontSize: 15, fontWeight: "600", color: "#E5E7EB" },
  toggleDesc: { fontSize: 12, color: "#6B7280", marginTop: 2, lineHeight: 16 },
  permissionTitle: { fontSize: 15, fontWeight: "700", color: "#fff", marginBottom: 4 },
  permissionDesc: { fontSize: 13, color: "#9CA3AF", lineHeight: 18, marginBottom: 12 },
  enableBtn: { backgroundColor: "#F97316", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignSelf: "flex-start" },
  enableBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
