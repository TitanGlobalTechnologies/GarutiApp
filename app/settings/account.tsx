import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import SafeArea from "../../components/SafeArea";
import Card from "../../components/Card";
import { useAuthContext } from "../../src/providers/AuthProvider";
import { showAlert, showConfirm } from "../../src/lib/alert";

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { profile, signOut, isDemoMode } = useAuthContext();

  function handleSignOut() {
    showConfirm("Sign Out", "Are you sure you want to sign out?", async () => {
      await signOut();
      router.replace("/auth/welcome");
    });
  }

  function handleDeleteAccount() {
    showConfirm(
      "Delete Account",
      "This will permanently delete your account, all conversation history, streak data, and adaptations. This cannot be undone.",
      () => {
        showAlert("Account Deleted", "Your account has been scheduled for deletion. You will receive a confirmation email.", () => {
          router.replace("/auth/welcome");
        });
      }
    );
  }

  return (
    <SafeArea style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Account</Text>

        {/* Account Info */}
        <Card>
          <Text style={styles.sectionTitle}>ACCOUNT DETAILS</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{profile?.full_name || "Demo Agent"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile?.email || "demo@lae.com"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Market</Text>
            <Text style={styles.infoValue}>
              {profile?.market_city || "Cape Coral"}, {profile?.market_state || "FL"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                : "March 2026"}
            </Text>
          </View>
        </Card>

        {/* Security */}
        <Card>
          <Text style={styles.sectionTitle}>SECURITY</Text>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => showAlert("Coming Soon", "Password change will be available when Supabase is connected.")}
          >
            <Text style={styles.actionText}>Change Password</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => showAlert("Coming Soon", "Two-factor authentication is planned for a future release.")}
          >
            <Text style={styles.actionText}>Two-Factor Authentication</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </Card>

        {/* Data */}
        <Card>
          <Text style={styles.sectionTitle}>YOUR DATA</Text>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => showAlert("Export Data", "Your data export will be emailed to you within 24 hours.")}
          >
            <Text style={styles.actionText}>Export My Data</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => showAlert("Privacy Policy", "Opens privacy policy page (coming soon).")}
          >
            <Text style={styles.actionText}>Privacy Policy</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => showAlert("Terms of Service", "Opens terms of service page (coming soon).")}
          >
            <Text style={styles.actionText}>Terms of Service</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </Card>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Delete */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>

        {isDemoMode && (
          <Text style={styles.demoNotice}>
            Demo Mode — Auth actions are simulated.{"\n"}Connect Supabase for real authentication.
          </Text>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1923" },
  scroll: { flex: 1, paddingHorizontal: 16 },
  backBtn: { color: "#9CA3AF", fontSize: 14, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#2a3a4e" },
  infoLabel: { fontSize: 14, color: "#6B7280" },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#E5E7EB" },
  actionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#2a3a4e" },
  actionText: { fontSize: 14, color: "#E5E7EB" },
  chevron: { fontSize: 18, color: "#6B7280" },
  signOutBtn: { marginTop: 20, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: "#2a3a4e", alignItems: "center" },
  signOutText: { color: "#F97316", fontWeight: "700", fontSize: 15 },
  deleteBtn: { marginTop: 12, paddingVertical: 12, alignItems: "center" },
  deleteText: { color: "#F87171", fontSize: 14 },
  demoNotice: { marginTop: 16, fontSize: 11, color: "#6B7280", textAlign: "center", lineHeight: 16 },
});
