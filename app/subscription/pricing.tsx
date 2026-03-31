import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import SafeArea from "../../components/SafeArea";
import Card from "../../components/Card";
import CTAButton from "../../components/CTAButton";
import { useSubscription, PLANS } from "../../src/hooks/useSubscription";
import type { SubscriptionTier } from "../../src/types/database";

export default function PricingScreen() {
  const router = useRouter();
  const { trialDaysRemaining, isTrialActive, subscribe } = useSubscription();

  async function handleSubscribe(tier: SubscriptionTier) {
    // TODO: When Stripe is connected, this opens Stripe Checkout
    Alert.alert(
      "Stripe Not Connected",
      `This will open Stripe Checkout for the ${tier} plan when API keys are configured.\n\nFor now, the subscription is simulated.`,
      [
        { text: "Cancel" },
        {
          text: "Simulate Subscribe",
          onPress: async () => {
            await subscribe(tier);
            Alert.alert("Subscribed!", "You're now on the plan.", [
              { text: "OK", onPress: () => router.back() },
            ]);
          },
        },
      ]
    );
  }

  return (
    <SafeArea style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Choose Your Plan</Text>
        {isTrialActive && (
          <View style={styles.trialBanner}>
            <Text style={styles.trialText}>
              🕐 {trialDaysRemaining} days left in your free trial
            </Text>
          </View>
        )}
        <Text style={styles.subtitle}>
          All plans include a 90-day money-back guarantee on coaching tiers.
        </Text>

        {/* Plan Cards */}
        {PLANS.map((plan) => (
          <Card
            key={plan.tier}
            borderLeftColor={plan.highlighted ? "#F97316" : undefined}
            style={plan.highlighted ? styles.highlightedCard : undefined}
          >
            {plan.badge && (
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>{plan.badge}</Text>
              </View>
            )}
            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceAmount}>${plan.price}</Text>
              <Text style={styles.priceInterval}>/month</Text>
            </View>
            <Text style={styles.planDesc}>{plan.description}</Text>

            <View style={styles.featureList}>
              {plan.features.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Text style={styles.featureCheck}>✓</Text>
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.planBtn,
                plan.highlighted && styles.planBtnHighlighted,
              ]}
              onPress={() => handleSubscribe(plan.tier)}
            >
              <Text
                style={[
                  styles.planBtnText,
                  plan.highlighted && styles.planBtnTextHighlighted,
                ]}
              >
                {plan.highlighted ? "Start Bundle" : `Choose ${plan.name}`}
              </Text>
            </TouchableOpacity>
          </Card>
        ))}

        <Text style={styles.guarantee}>
          🛡️ 90-day appointment guarantee on coaching & bundle tiers.{"\n"}
          10 qualified appointments or your coaching fees back.
        </Text>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1923" },
  scroll: { flex: 1, paddingHorizontal: 16 },
  backBtn: { color: "#9CA3AF", fontSize: 14, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700", color: "#fff", marginBottom: 8 },
  trialBanner: {
    backgroundColor: "rgba(249,115,22,0.15)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  trialText: { color: "#F97316", fontSize: 14, fontWeight: "600", textAlign: "center" },
  subtitle: { fontSize: 13, color: "#9CA3AF", marginBottom: 20, lineHeight: 18 },
  highlightedCard: { borderWidth: 1, borderColor: "#F97316" },
  planBadge: {
    backgroundColor: "#F97316",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  planBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  planName: { fontSize: 18, fontWeight: "700", color: "#fff", marginBottom: 4 },
  priceRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 6 },
  priceAmount: { fontSize: 32, fontWeight: "800", color: "#F97316" },
  priceInterval: { fontSize: 14, color: "#6B7280", marginLeft: 2 },
  planDesc: { fontSize: 13, color: "#9CA3AF", marginBottom: 14, lineHeight: 18 },
  featureList: { gap: 8, marginBottom: 16 },
  featureRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  featureCheck: { color: "#4ADE80", fontSize: 14, fontWeight: "700", marginTop: 1 },
  featureText: { color: "#E5E7EB", fontSize: 13, flex: 1, lineHeight: 18 },
  planBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a3a4e",
    alignItems: "center",
  },
  planBtnHighlighted: {
    backgroundColor: "#F97316",
    borderColor: "#F97316",
  },
  planBtnText: { color: "#9CA3AF", fontWeight: "700", fontSize: 15 },
  planBtnTextHighlighted: { color: "#fff" },
  guarantee: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 8,
  },
});
