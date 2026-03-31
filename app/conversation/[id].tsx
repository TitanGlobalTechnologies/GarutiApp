import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import SafeArea from "../../components/SafeArea";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import CTAButton from "../../components/CTAButton";
import { useConversationsContext } from "../../src/providers/ConversationsProvider";
import { STATUS_CONFIG, CHANNEL_ICONS } from "../../src/data/mock-conversations";
import type { ConversationStatus } from "../../src/types/database";

const STATUS_FLOW: ConversationStatus[] = [
  "dm_received",
  "in_conversation",
  "appointment_set",
  "follow_up_needed",
  "closed_won",
  "closed_lost",
];

export default function ConversationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { conversations, updateStatus, deleteConversation } = useConversationsContext();

  const convo = conversations.find((c) => c.id === id);
  const [statusUpdated, setStatusUpdated] = useState(false);

  if (!convo) {
    return (
      <SafeArea style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Conversation not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeArea>
    );
  }

  const config = STATUS_CONFIG[convo.status];
  const channelIcon = CHANNEL_ICONS[convo.channel];
  const created = new Date(convo.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  async function handleStatusChange(newStatus: ConversationStatus) {
    await updateStatus(convo.id, newStatus);
    setStatusUpdated(true);
    setTimeout(() => setStatusUpdated(false), 2000);
  }

  return (
    <SafeArea style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back to Tracker</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {convo.contact_name.split(" ").map((n) => n[0]).join("")}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{convo.contact_name}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.channelIcon}>{channelIcon}</Text>
              <Text style={styles.meta}>
                via {convo.channel.toUpperCase()} · {created}
              </Text>
            </View>
          </View>
          <Badge label={config.label} variant={config.variant} />
        </View>

        {/* Notes */}
        {convo.notes && (
          <Card>
            <Text style={styles.cardTitle}>NOTES</Text>
            <Text style={styles.notes}>{convo.notes}</Text>
          </Card>
        )}

        {/* Appointment */}
        {convo.appointment_date && (
          <Card borderLeftColor="#4ADE80">
            <Text style={styles.cardTitle}>APPOINTMENT</Text>
            <Text style={styles.appointmentDate}>
              {new Date(convo.appointment_date).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </Text>
          </Card>
        )}

        {/* Update Status */}
        <Card>
          <View style={styles.statusHeader}>
            <Text style={styles.cardTitle}>UPDATE STATUS</Text>
            {statusUpdated && <Text style={styles.savedText}>✓ Saved</Text>}
          </View>
          <View style={styles.statusGrid}>
            {STATUS_FLOW.map((s) => {
              const sc = STATUS_CONFIG[s];
              const isActive = convo.status === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusBtn,
                    isActive && { backgroundColor: "#F97316", borderColor: "#F97316" },
                  ]}
                  onPress={() => handleStatusChange(s)}
                >
                  <Text
                    style={[styles.statusBtnText, isActive && { color: "#fff" }]}
                  >
                    {sc.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Actions */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={async () => {
            if (typeof window !== "undefined" && !window.confirm(`Delete ${convo.contact_name} from tracker?`)) return;
            await deleteConversation(convo.id);
            router.back();
          }}
        >
          <Text style={styles.deleteBtnText}>Delete Conversation</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1923" },
  scroll: { flex: 1, paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { color: "#F87171", fontSize: 16 },
  backLink: { color: "#F97316", fontSize: 14, marginTop: 12 },
  backBtn: { color: "#9CA3AF", fontSize: 14, marginBottom: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#fff" },
  name: { fontSize: 20, fontWeight: "700", color: "#fff" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  channelIcon: { fontSize: 14 },
  meta: { fontSize: 12, color: "#9CA3AF" },
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  savedText: { color: "#4ADE80", fontSize: 13, fontWeight: "600" },
  notes: { fontSize: 14, color: "#E5E7EB", lineHeight: 22 },
  appointmentDate: { fontSize: 16, fontWeight: "600", color: "#4ADE80" },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#1a2636",
    borderWidth: 1,
    borderColor: "#2a3a4e",
  },
  statusBtnText: { color: "#9CA3AF", fontSize: 13, fontWeight: "600" },
  deleteBtn: { marginTop: 16, alignItems: "center", padding: 12 },
  deleteBtnText: { color: "#F87171", fontSize: 14 },
});
