import { useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import SafeArea from "../../components/SafeArea";
import Card from "../../components/Card";
import CTAButton from "../../components/CTAButton";
import { useAuthContext } from "../../src/providers/AuthProvider";
import { useUI } from "../../src/providers/UIProvider";

const EXPERIENCE_OPTIONS = [
  { value: 2, label: "1-3 years" },
  { value: 5, label: "3-7 years" },
  { value: 10, label: "7-15 years" },
  { value: 20, label: "15+ years" },
];

export default function MarketSettingsScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useAuthContext();
  const { showToast } = useUI();
  const [city, setCity] = useState(profile?.market_city || "");
  const [state, setState] = useState(profile?.market_state || "");
  const [zip, setZip] = useState(profile?.market_zip || "");
  const [experience, setExperience] = useState(profile?.experience_years || 8);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!city.trim() || !state.trim() || !zip.trim()) {
      showToast({ message: "Please enter your market city, state, and zip code.", type: "error" });
      return;
    }
    await updateProfile({
      market_city: city.trim(),
      market_state: state.toUpperCase().trim(),
      market_zip: zip.trim(),
      experience_years: experience,
    });
    setSaved(true);
    showToast({ message: "Market area updated! Digest will refresh.", type: "success" });
  }

  return (
    <SafeArea style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Market Area</Text>
        <Text style={styles.subtitle}>
          This determines which local content appears in your daily digest.
          The AI will find top-performing Reels and Shorts from agents in this market.
        </Text>

        <Card>
          <View style={styles.field}>
            <Text style={styles.label}>CITY</Text>
            <TextInput
              style={styles.input}
              placeholder="Cape Coral"
              placeholderTextColor="#6B7280"
              value={city}
              onChangeText={(v) => { setCity(v); setSaved(false); }}
              autoCapitalize="words"
            />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>STATE</Text>
              <TextInput
                style={styles.input}
                placeholder="FL"
                placeholderTextColor="#6B7280"
                value={state}
                onChangeText={(v) => { setState(v.toUpperCase().slice(0, 2)); setSaved(false); }}
                autoCapitalize="characters"
                maxLength={2}
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>ZIP CODE</Text>
              <TextInput
                style={styles.input}
                placeholder="33914"
                placeholderTextColor="#6B7280"
                value={zip}
                onChangeText={(v) => { setZip(v.replace(/[^0-9]/g, "").slice(0, 5)); setSaved(false); }}
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>
          </View>
        </Card>

        <Card>
          <Text style={styles.label}>EXPERIENCE LEVEL</Text>
          <Text style={styles.hint}>Helps us tailor coaching content to your level</Text>
          <View style={styles.chipRow}>
            {EXPERIENCE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, experience === opt.value && styles.chipActive]}
                onPress={() => { setExperience(opt.value); setSaved(false); }}
              >
                <Text style={[styles.chipText, experience === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <CTAButton label={saved ? "✓ Saved" : "Save Changes"} onPress={handleSave} />
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
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  hint: { fontSize: 12, color: "#6B7280", marginBottom: 12 },
  input: { backgroundColor: "#0F1923", borderRadius: 10, padding: 14, fontSize: 16, color: "#fff", borderWidth: 1, borderColor: "#2a3a4e" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: "#0F1923", borderWidth: 1, borderColor: "#2a3a4e" },
  chipActive: { backgroundColor: "#F97316", borderColor: "#F97316" },
  chipText: { color: "#9CA3AF", fontSize: 14, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
});
