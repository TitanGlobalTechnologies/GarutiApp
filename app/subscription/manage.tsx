import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useUI } from "../../src/providers/UIProvider";
import { useAuthContext } from "../../src/providers/AuthProvider";
import { useRouter } from "expo-router";
import SafeArea from "../../components/SafeArea";
import Card from "../../components/Card";
import ProgressBar from "../../components/ProgressBar";
import CTAButton from "../../components/CTAButton";
import { useSubscription } from "../../src/hooks/useSubscription";

export default function ManageSubscriptionScreen() {
  const router = useRouter();
  const {
    tier,
    status,
    trialDaysRemaining,
    isTrialActive,
    isActive,
    currentPlan,
    cancelSubscription,
    pauseSubscription,
  } = useSubscription();
  const { profile } = useAuthContext();
  const { showToast, showConfirm } = useUI();
  const marketLabel = `${profile?.market_city || "Cape Coral"}, ${profile?.market_state || "FL"}`;

  async function handleCancel() {
    const confirmed = await showConfirm({
      title: "Cancel Subscription",
      message: "Are you sure? You'll lose access to your digest, adaptations, and conversation history.",
      confirmLabel: "Cancel Subscription",
      destructive: true,
    });
    if (confirmed) {
      await cancelSubscription();
      showToast({ message: "Subscription cancelled.", type: "info" });
    }
  }

  async function handlePause() {
    const confirmed = await showConfirm({
      title: "Pause Subscription",
      message: "Pause for 1 month at $0. Your data is saved and you can resume anytime.",
      confirmLabel: "Pause 1 Month",
    });
    if (confirmed) {
      await pauseSubscription();
      showToast({ message: "Subscription paused for 1 month.", type: "success" });
    }
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    trialing: { label: "Free Trial", color: "#F97316" },
    active: { label: "Active", color: "#4ADE80" },
    past_due: { label: "Past Due", color: "#F87171" },
    canceled: { label: "Cancelled", color: "#F87171" },
    paused: { label: "Paused", color: "#FBBF24" },
  };

  const statusInfo = statusLabels[status] || statusLabels.trialing;

  return (
    <SafeArea style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Subscription</Text>

        {/* Current Plan */}
        <Card borderLeftColor={statusInfo.color}>
          <Text style={styles.cardTitle}>CURRENT PLAN</Text>
          <Text style={styles.planName}>
            {currentPlan ? currentPlan.name : "Free Trial"}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>

          {isTrialActive && (
            <View style={styles.trialSection}>
              <Text style={styles.trialDays}>
                {trialDaysRemaining} days remaining
              </Text>
              <ProgressBar
                progress={(14 - trialDaysRemaining) / 14}
                color="#F97316"
              />
              <Text style={styles.trialHint}>
                Your trial includes full access to all features.
              </Text>
            </View>
          )}

          {currentPlan && (
            <Text style={styles.priceText}>
              {currentPlan.priceLabel}
            </Text>
          )}
        </Card>

        {/* What You'll Lose */}
        {isTrialActive && (
          <Card>
            <Text style={styles.cardTitle}>WHAT YOU'LL LOSE IF YOU DON'T SUBSCRIBE</Text>
            <View style={styles.loseList}>
              {[
                `Your daily digest (personalized for ${marketLabel})`,
                "47 tracked conversations and their history",
                "Your 12-day posting streak",
                "6 earned badges",
                "All AI-generated adaptations",
              ].map((item, i) => (
                <View key={i} style={styles.loseRow}>
                  <Text style={styles.loseX}>✕</Text>
                  <Text style={styles.loseText}>{item}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Actions */}
        {isTrialActive && (
          <CTAButton
            label="Choose a Plan"
            onPress={() => router.push("/subscription/pricing")}
          />
        )}

        {isActive && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={() => router.push("/subscription/pricing")}
            >
              <Text style={styles.upgradeBtnText}>Change Plan</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handlePause}>
              <Text style={styles.actionBtnText}>Pause Subscription (1 month free)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleCancel}>
              <Text style={[styles.actionBtnText, { color: "#F87171" }]}>
                Cancel Subscription
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Billing Info Placeholder */}
        <Card>
          <Text style={styles.cardTitle}>BILLING</Text>
          <Text style={styles.billingText}>
            {isActive
              ? "Managed via Stripe Customer Portal"
              : "Billing starts when you choose a plan"}
          </Text>
          <TouchableOpacity style={styles.portalBtn}>
            <Text style={styles.portalBtnText}>
              Open Billing Portal →
            </Text>
          </TouchableOpacity>
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
  title: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 16 },
  cardTitle: {
    fontSize: 13, fontWeight: "600", color: "#9CA3AF",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
  },
  planName: { fontSize: 20, fontWeight: "700", color: "#fff", marginBottom: 6 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: "600" },
  trialSection: { marginTop: 4, gap: 6 },
  trialDays: { fontSize: 14, fontWeight: "600", color: "#F97316" },
  trialHint: { fontSize: 12, color: "#6B7280", marginTop: 4 },
  priceText: { fontSize: 16, fontWeight: "700", color: "#F97316", marginTop: 8 },
  loseList: { gap: 8 },
  loseRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  loseX: { color: "#F87171", fontSize: 13, fontWeight: "700", marginTop: 1 },
  loseText: { color: "#E5E7EB", fontSize: 13, flex: 1, lineHeight: 18 },
  actions: { gap: 12, marginTop: 8 },
  upgradeBtn: {
    paddingVertical: 14, borderRadius: 12,
    backgroundColor: "#F97316", alignItems: "center",
  },
  upgradeBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  actionBtn: {
    paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: "#2a3a4e", alignItems: "center",
  },
  actionBtnText: { color: "#9CA3AF", fontWeight: "600", fontSize: 14 },
  billingText: { color: "#6B7280", fontSize: 13, marginBottom: 8 },
  portalBtn: { marginTop: 4 },
  portalBtnText: { color: "#60A5FA", fontSize: 13, fontWeight: "600" },
});
