import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthContext } from "../../src/providers/AuthProvider";
import CTAButton from "../../components/CTAButton";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuthContext();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [marketCity, setMarketCity] = useState("");
  const [marketState, setMarketState] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!fullName || !email || !password || !marketCity || !marketState) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, fullName, marketCity, marketState);
    setLoading(false);

    if (error) {
      Alert.alert("Sign up failed", error.message);
    } else {
      Alert.alert(
        "Check your email",
        "We sent you a confirmation link. Please verify your email to continue.",
        [{ text: "OK", onPress: () => router.replace("/auth/signin") }]
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>
          Start your 14-day free trial. No credit card required.
        </Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Jane Smith"
              placeholderTextColor="#6B7280"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

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
              placeholder="At least 8 characters"
              placeholderTextColor="#6B7280"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Your Market (City)</Text>
            <TextInput
              style={styles.input}
              placeholder="Cape Coral"
              placeholderTextColor="#6B7280"
              value={marketCity}
              onChangeText={setMarketCity}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              placeholder="FL"
              placeholderTextColor="#6B7280"
              value={marketState}
              onChangeText={(v) => setMarketState(v.toUpperCase().slice(0, 2))}
              autoCapitalize="characters"
              maxLength={2}
            />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 16 }} />
        ) : (
          <CTAButton label="Start Free Trial" onPress={handleSignUp} />
        )}

        <Text style={styles.terms}>
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </Text>

        <Text
          style={styles.signInLink}
          onPress={() => router.replace("/auth/signin")}
        >
          Already have an account? <Text style={styles.linkBold}>Sign In</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1923" },
  scroll: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  backBtn: { color: "#9CA3AF", fontSize: 16, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "700", color: "#fff", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#9CA3AF", marginBottom: 32, lineHeight: 20 },
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
  terms: { fontSize: 12, color: "#6B7280", textAlign: "center", marginTop: 16, lineHeight: 18 },
  signInLink: { color: "#9CA3AF", textAlign: "center", fontSize: 14, marginTop: 20 },
  linkBold: { color: "#F97316", fontWeight: "600" },
});
