import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import SafeArea from "../../components/SafeArea";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import CTAButton from "../../components/CTAButton";
import { useAdaptations } from "../../src/hooks/useAdaptations";

export default function AdaptationDetailScreen() {
  const { url, title } = useLocalSearchParams<{ url: string; title: string }>();
  const router = useRouter();
  const decodedUrl = decodeURIComponent(url || "");
  const { adaptations, loading } = useAdaptations(decodedUrl, "Cape Coral");
  const [selectedVersion, setSelectedVersion] = useState<number>(1);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const selected = adaptations.find((a) => a.versionNumber === selectedVersion);

  async function copyToClipboard(text: string, index: number) {
    try {
      if (Platform.OS === "web") {
        await navigator.clipboard.writeText(text);
      }
      // TODO: use expo-clipboard for native
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      Alert.alert("Copy failed", "Could not copy to clipboard.");
    }
  }

  return (
    <SafeArea style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Text style={styles.backBtn}>← Back to Digest</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Adaptations</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          Based on: {title || decodedUrl}
        </Text>

        {/* Version Selector */}
        <View style={styles.versionRow}>
          {[1, 2, 3, 4, 5].map((v) => (
            <TouchableOpacity
              key={v}
              style={[
                styles.versionBtn,
                selectedVersion === v && styles.versionBtnActive,
              ]}
              onPress={() => setSelectedVersion(v)}
            >
              <Text
                style={[
                  styles.versionText,
                  selectedVersion === v && styles.versionTextActive,
                ]}
              >
                V{v}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selected && (
          <>
            {/* Hook */}
            <Card>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>HOOK</Text>
                <Badge label={`Version ${selected.versionNumber}`} variant="orange" />
              </View>
              <Text style={styles.hookText}>"{selected.hook}"</Text>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => copyToClipboard(selected.hook, 0)}
              >
                <Text style={styles.copyBtnText}>
                  {copiedIndex === 0 ? "Copied!" : "Copy Hook"}
                </Text>
              </TouchableOpacity>
            </Card>

            {/* Full Script */}
            <Card>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>FULL SCRIPT</Text>
                <Text style={styles.duration}>~45 sec</Text>
              </View>
              <Text style={styles.scriptText}>{selected.fullScript}</Text>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => copyToClipboard(selected.fullScript, 1)}
              >
                <Text style={styles.copyBtnText}>
                  {copiedIndex === 1 ? "Copied!" : "Copy Script"}
                </Text>
              </TouchableOpacity>
            </Card>

            {/* CTA */}
            <Card>
              <Text style={styles.cardTitle}>CALL-TO-ACTION</Text>
              <Text style={[styles.ctaText, { marginTop: 8 }]}>"{selected.cta}"</Text>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => copyToClipboard(selected.cta, 2)}
              >
                <Text style={styles.copyBtnText}>
                  {copiedIndex === 2 ? "Copied!" : "Copy CTA"}
                </Text>
              </TouchableOpacity>
            </Card>

            {/* Posting Time */}
            <Card>
              <View style={styles.timeRow}>
                <Text style={styles.timeIcon}>🕐</Text>
                <View>
                  <Text style={styles.cardTitle}>BEST TIME TO POST</Text>
                  <Text style={styles.timeText}>{selected.suggestedPostTime}</Text>
                </View>
              </View>
            </Card>

            {/* Actions */}
            <CTAButton
              label="Mark as Posted ✓"
              onPress={() => {
                Alert.alert("Posted!", "Great job! This has been logged to your tracker.", [
                  { text: "OK", onPress: () => router.back() },
                ]);
              }}
            />

            <TouchableOpacity style={styles.originalLink}>
              <Text style={styles.originalLinkText}>View Original Post →</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1923" },
  scroll: { flex: 1, paddingHorizontal: 16 },
  backRow: { marginBottom: 16 },
  backBtn: { color: "#9CA3AF", fontSize: 14 },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#6B7280", marginBottom: 20, lineHeight: 18 },
  versionRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  versionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#1a2636",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a3a4e",
  },
  versionBtnActive: {
    backgroundColor: "#F97316",
    borderColor: "#F97316",
  },
  versionText: { color: "#9CA3AF", fontWeight: "600", fontSize: 14 },
  versionTextActive: { color: "#fff" },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  duration: { fontSize: 12, color: "#6B7280" },
  hookText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FBBF24",
    lineHeight: 24,
    fontStyle: "italic",
  },
  scriptText: { fontSize: 14, color: "#E5E7EB", lineHeight: 22 },
  ctaText: { fontSize: 14, color: "#60A5FA", lineHeight: 22, fontStyle: "italic" },
  copyBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#2a3a4e",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  copyBtnText: { color: "#F97316", fontSize: 13, fontWeight: "600" },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  timeIcon: { fontSize: 28 },
  timeText: { fontSize: 16, fontWeight: "600", color: "#fff", marginTop: 4 },
  originalLink: { marginTop: 16, alignItems: "center" },
  originalLinkText: { color: "#60A5FA", fontSize: 14 },
});
