import { useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import SafeArea from "../../components/SafeArea";
import Card from "../../components/Card";
import CTAButton from "../../components/CTAButton";
import { useAuthContext } from "../../src/providers/AuthProvider";
import { useUI } from "../../src/providers/UIProvider";

const STYLE_OPTIONS = [
  { value: "professional", label: "Professional", desc: "Data-driven, authoritative, market expert tone" },
  { value: "friendly", label: "Friendly & Casual", desc: "Approachable, conversational, relatable tone" },
  { value: "educational", label: "Educational", desc: "Teacher-like, explaining concepts clearly" },
  { value: "energetic", label: "High Energy", desc: "Enthusiastic, motivational, fast-paced" },
];

/**
 * Parse the stored content_style back into style + notes.
 * Stored as "professional" or "professional — my custom notes"
 */
function parseStoredStyle(stored: string | null | undefined): { style: string; notes: string } {
  if (!stored) return { style: "friendly", notes: "" };
  const parts = stored.split(" — ");
  const styleValue = parts[0].trim();
  const notes = parts.length > 1 ? parts.slice(1).join(" — ").trim() : "";
  // Check if the style value matches one of our options
  const isKnown = STYLE_OPTIONS.some((o) => o.value === styleValue);
  return { style: isKnown ? styleValue : "friendly", notes };
}

export default function ContentStyleScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useAuthContext();
  const { showToast } = useUI();
  const parsed = parseStoredStyle(profile?.content_style);
  const [style, setStyle] = useState(parsed.style);
  const [customNotes, setCustomNotes] = useState(parsed.notes);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    const fullStyle = customNotes.trim()
      ? `${style} — ${customNotes.trim()}`
      : style;
    await updateProfile({ content_style: fullStyle });
    setSaved(true);
    showToast({ message: "Content style saved! AI will match this tone.", type: "success" });
  }

  return (
    <SafeArea style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Content Style</Text>
        <Text style={styles.subtitle}>
          Tell us how you sound on camera. The AI will match this voice when generating your 5 daily script adaptations.
        </Text>

        <Card>
          <Text style={styles.label}>YOUR VOICE</Text>
          {STYLE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.styleOption, style === opt.value && styles.styleOptionActive]}
              onPress={() => { setStyle(opt.value); setSaved(false); }}
            >
              <View style={styles.styleRow}>
                <View style={[styles.radio, style === opt.value && styles.radioActive]}>
                  {style === opt.value && <View style={styles.radioDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.styleLabel, style === opt.value && { color: "#fff" }]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.styleDesc}>{opt.desc}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </Card>

        <Card>
          <Text style={styles.label}>ANYTHING ELSE THE AI SHOULD KNOW?</Text>
          <Text style={styles.hint}>
            E.g., "I always mention my team name" or "I avoid slang" or "I focus on first-time buyers"
          </Text>
          <TextInput
            style={[styles.input, { minHeight: 80 }]}
            placeholder="Optional — add any personal notes about your content style"
            placeholderTextColor="#6B7280"
            value={customNotes}
            onChangeText={(v) => { setCustomNotes(v); setSaved(false); }}
            multiline
            textAlignVertical="top"
          />
        </Card>

        <CTAButton label={saved ? "✓ Saved" : "Save Style"} onPress={handleSave} />
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
  label: { fontSize: 13, fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  hint: { fontSize: 12, color: "#6B7280", marginBottom: 10, lineHeight: 16 },
  input: { backgroundColor: "#0F1923", borderRadius: 10, padding: 14, fontSize: 14, color: "#fff", borderWidth: 1, borderColor: "#2a3a4e" },
  styleOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#2a3a4e" },
  styleOptionActive: { borderBottomColor: "#F97316" },
  styleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#2a3a4e", alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: "#F97316" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#F97316" },
  styleLabel: { fontSize: 15, fontWeight: "600", color: "#9CA3AF" },
  styleDesc: { fontSize: 12, color: "#6B7280", marginTop: 2 },
});
