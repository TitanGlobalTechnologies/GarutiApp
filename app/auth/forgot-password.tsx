import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthContext } from "../../src/providers/AuthProvider";
import { useUI } from "../../src/providers/UIProvider";
import CTAButton from "../../components/CTAButton";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuthContext();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useUI();
  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (!email) {
      showToast({ message: "Please enter your email address.", type: "error" });
      return;
    }
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);

    if (error) {
      showToast({ message: error.message, type: "error" });
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.inner}>
          <View style={styles.sentIcon}>
            <Text style={{ fontSize: 48 }}>📧</Text>
          </View>
          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.subtitle}>
            We sent a password reset link to{"\n"}
            <Text style={{ color: "#F97316" }}>{email}</Text>
          </Text>
          <CTAButton label="Back to Sign In" onPress={() => router.replace("/auth/signin")} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a link to reset your password.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="jane@example.com"
            placeholderTextColor="#6B7280"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 24 }} />
        ) : (
          <View style={{ marginTop: 24 }}>
            <CTAButton label="Send Reset Link" onPress={handleReset} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1923" },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 56, justifyContent: "center" },
  backBtn: { color: "#9CA3AF", fontSize: 16, marginBottom: 32 },
  title: { fontSize: 28, fontWeight: "700", color: "#fff", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#9CA3AF", textAlign: "center", marginBottom: 32, lineHeight: 20 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    backgroundColor: "#1a2636",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#2a3a4e",
  },
  sentIcon: { alignSelf: "center", marginBottom: 16 },
});
