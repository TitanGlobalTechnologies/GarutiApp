import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import SafeArea from "../../components/SafeArea";
import CTAButton from "../../components/CTAButton";
import { useConversationsContext } from "../../src/providers/ConversationsProvider";
import type { ConversationChannel, ConversationStatus } from "../../src/types/database";

const CHANNELS: { value: ConversationChannel; label: string; icon: string }[] = [
  { value: "dm", label: "DM", icon: "💬" },
  { value: "comment", label: "Comment", icon: "💭" },
  { value: "call", label: "Call", icon: "📞" },
  { value: "email", label: "Email", icon: "📧" },
  { value: "other", label: "Other", icon: "📱" },
];

const STATUSES: { value: ConversationStatus; label: string }[] = [
  { value: "dm_received", label: "DM Received" },
  { value: "in_conversation", label: "In Conversation" },
  { value: "appointment_set", label: "Appointment Set" },
  { value: "follow_up_needed", label: "Follow-up Needed" },
];

export default function NewConversationScreen() {
  const router = useRouter();
  const { addConversation } = useConversationsContext();
  const [contactName, setContactName] = useState("");
  const [channel, setChannel] = useState<ConversationChannel>("dm");
  const [status, setStatus] = useState<ConversationStatus>("dm_received");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState("");

  async function handleSave() {
    if (!contactName.trim()) {
      setError("Please enter the contact's name.");
      return;
    }

    setError("");
    await addConversation({
      contactName: contactName.trim(),
      channel,
      status,
      notes: notes.trim(),
    });

    // Navigate back immediately — the conversation appears on the tracker
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeArea style={styles.container} edges={["top"]}>
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Log Conversation</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Text style={styles.subtitle}>
            Track every lead from your content
          </Text>

          {/* Contact Name */}
          <View style={styles.field}>
            <Text style={styles.label}>CONTACT NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="Maria G."
              placeholderTextColor="#6B7280"
              value={contactName}
              onChangeText={setContactName}
              autoCapitalize="words"
              autoFocus
            />
          </View>

          {/* Channel */}
          <View style={styles.field}>
            <Text style={styles.label}>HOW DID THEY REACH YOU?</Text>
            <View style={styles.chipRow}>
              {CHANNELS.map((ch) => (
                <TouchableOpacity
                  key={ch.value}
                  style={[styles.chip, channel === ch.value && styles.chipActive]}
                  onPress={() => setChannel(ch.value)}
                >
                  <Text style={styles.chipIcon}>{ch.icon}</Text>
                  <Text style={[styles.chipText, channel === ch.value && styles.chipTextActive]}>
                    {ch.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Status */}
          <View style={styles.field}>
            <Text style={styles.label}>STATUS</Text>
            <View style={styles.chipRow}>
              {STATUSES.map((st) => (
                <TouchableOpacity
                  key={st.value}
                  style={[styles.statusChip, status === st.value && styles.statusChipActive]}
                  onPress={() => setStatus(st.value)}
                >
                  <Text style={[styles.statusText, status === st.value && styles.statusTextActive]}>
                    {st.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={styles.label}>NOTES (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What did they ask about? Which Reel brought them in?"
              placeholderTextColor="#6B7280"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={{ marginTop: 8 }}>
            <CTAButton label="Log Conversation" onPress={handleSave} />
          </View>
          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeArea>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1923" },
  scroll: { flex: 1, paddingHorizontal: 16 },
  backBtn: { color: "#9CA3AF", fontSize: 14, marginBottom: 16 },
  errorText: { color: "#F87171", fontSize: 13, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#9CA3AF", marginBottom: 24 },
  field: { marginBottom: 24 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1a2636",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#2a3a4e",
  },
  textArea: { minHeight: 100 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#1a2636",
    borderWidth: 1,
    borderColor: "#2a3a4e",
  },
  chipActive: { backgroundColor: "#F97316", borderColor: "#F97316" },
  chipIcon: { fontSize: 16 },
  chipText: { color: "#9CA3AF", fontSize: 14, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#1a2636",
    borderWidth: 1,
    borderColor: "#2a3a4e",
    marginBottom: 4,
  },
  statusChipActive: { backgroundColor: "#F97316", borderColor: "#F97316" },
  statusText: { color: "#9CA3AF", fontSize: 13, fontWeight: "600" },
  statusTextActive: { color: "#fff" },
});
