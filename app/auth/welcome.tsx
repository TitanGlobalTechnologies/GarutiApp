import { View, Text, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import CTAButton from "../../components/CTAButton";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo / Brand */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>LAE</Text>
          </View>
          <Text style={styles.title}>Local Authority{"\n"}Engine</Text>
          <Text style={styles.subtitle}>
            The daily system that turns social content{"\n"}into real estate appointments
          </Text>
        </View>

        {/* Value Props */}
        <View style={styles.features}>
          {[
            { icon: "📊", text: "Daily digest of top-performing local Reels" },
            { icon: "🤖", text: "5 AI-adapted scripts ready to post" },
            { icon: "📈", text: "Track conversations to closings" },
            { icon: "🎯", text: "10 appointments in 90 days — guaranteed" },
          ].map((item, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{item.icon}</Text>
              <Text style={styles.featureText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* CTAs */}
      <View style={styles.ctas}>
        <CTAButton
          label="Start 14-Day Free Trial"
          onPress={() => router.push("/auth/signup")}
        />
        <Text
          style={styles.signInLink}
          onPress={() => router.push("/auth/signin")}
        >
          Already have an account? <Text style={styles.signInBold}>Sign In</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F1923",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: "space-between",
  },
  content: { flex: 1 },
  logoSection: { alignItems: "center", marginBottom: 40 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoText: { fontSize: 24, fontWeight: "800", color: "#fff" },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    lineHeight: 34,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },
  features: { gap: 16 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIcon: { fontSize: 24 },
  featureText: { fontSize: 15, color: "#E5E7EB", flex: 1, lineHeight: 20 },
  ctas: { gap: 16 },
  signInLink: {
    color: "#9CA3AF",
    textAlign: "center",
    fontSize: 14,
  },
  signInBold: { color: "#F97316", fontWeight: "600" },
});
