import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthContext } from "../../src/providers/AuthProvider";
import { useUI } from "../../src/providers/UIProvider";
import CTAButton from "../../components/CTAButton";

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuthContext();
  const { showToast } = useUI();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) {
      showToast({ message: "Please enter your email and password.", type: "error" });
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      showToast({ message: error.message, type: "error" });
    }
    // Auth state listener in useAuth will handle navigation
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>LAE</Text>
        </View>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        {/* Form */}
        <View style={styles.form}>
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

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#6B7280"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity onPress={() => router.push("/auth/forgot-password")}>
            <Text style={styles.forgotLink}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 16 }} />
        ) : (
          <CTAButton label="Sign In" onPress={handleSignIn} />
        )}

        <Text
          style={styles.signUpLink}
          onPress={() => router.replace("/auth/signup")}
        >
          Don't have an account?{" "}
          <Text style={styles.linkBold}>Start Free Trial</Text>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1923" },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 56, justifyContent: "center" },
  backBtn: { color: "#9CA3AF", fontSize: 16, marginBottom: 32 },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  logoText: { fontSize: 18, fontWeight: "800", color: "#fff" },
  title: { fontSize: 28, fontWeight: "700", color: "#fff", textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#9CA3AF", textAlign: "center", marginBottom: 32 },
  form: { gap: 20, marginBottom: 24 },
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
  forgotLink: { color: "#F97316", fontSize: 13, textAlign: "right" },
  signUpLink: { color: "#9CA3AF", textAlign: "center", fontSize: 14, marginTop: 24 },
  linkBold: { color: "#F97316", fontWeight: "600" },
});
