import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, TextInput, Platform, Linking } from "react-native";
import SafeArea from "../../components/SafeArea";
import Card from "../../components/Card";
import HighlightGlow from "../../components/HighlightGlow";
import { useAuthContext } from "../../src/providers/AuthProvider";
import { useUI } from "../../src/providers/UIProvider";
import { useDigest } from "../../src/hooks/useDigest";
import { useAdaptations } from "../../src/hooks/useAdaptations";

function formatViews(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

export default function DigestScreen() {
  const { profile } = useAuthContext();
  const { showToast } = useUI();
  const marketCity = profile?.market_city || "Cape Coral";
  const marketState = profile?.market_state || "FL";
  const contentStyle = profile?.content_style || undefined;
  const { content, loading, refresh } = useDigest(marketCity, marketState);

  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [showScript, setShowScript] = useState(false);
  const [editableScript, setEditableScript] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const selectedItem = content.find((c) => c.url === selectedUrl);
  const { adaptations, loading: adaptLoading } = useAdaptations(
    selectedUrl || "",
    marketCity,
    contentStyle
  );

  function handleSelectReel(url: string) {
    if (selectedUrl === url) {
      setSelectedUrl(null);
      setShowScript(false);
      setEditableScript("");
      setIsEditing(false);
    } else {
      setSelectedUrl(url);
      setShowScript(false);
      setEditableScript("");
      setIsEditing(false);
    }
  }

  function handleGenerateScript() {
    if (!selectedUrl || adaptations.length === 0) return;
    const script = adaptations[0]?.fullScript || "";
    setEditableScript(script);
    setShowScript(true);
    setIsEditing(false);
  }

  async function handleSaveScript() {
    let copied = false;
    if (Platform.OS === "web") {
      try {
        await navigator.clipboard.writeText(editableScript);
        copied = true;
      } catch {}
    }
    setIsEditing(false);
    showToast({
      message: copied ? "Script saved and copied to clipboard!" : "Script saved!",
      type: "success",
      duration: 3000,
    });
  }

  if (loading && content.length === 0) {
    return (
      <SafeArea style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading your digest...</Text>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#F97316" />
        }
      >
        <Text style={styles.title}>Your Daily Digest</Text>

        {/* Location + Streak */}
        <View style={styles.headerRow}>
          <Text style={styles.location}>{marketCity}, {marketState}</Text>
          <View style={styles.streakRow}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakNum}>12</Text>
            <Text style={styles.streakLabel}>day streak</Text>
          </View>
        </View>

        {/* Top Performing Content — tap to select */}
        <HighlightGlow target="digest-reels-list">
        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>TOP PERFORMING CONTENT</Text>
            <Text style={styles.viralityLabel}>Virality</Text>
          </View>
          {content.map((item) => {
            const isSelected = selectedUrl === item.url;
            return (
              <TouchableOpacity
                key={item.url}
                onPress={() => handleSelectReel(item.url)}
                activeOpacity={0.6}
              >
                <View style={[styles.reelRow, isSelected && styles.reelRowSelected]}>
                  <View style={styles.reelRadio}>
                    <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </View>
                  <View style={styles.reelContent}>
                    <Text style={styles.reelTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.reelMeta}>
                      @{item.creatorHandle} · {formatViews(item.views || item.likes)} {item.views ? "views" : "likes"}
                    </Text>
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); Linking.openURL(item.url); }}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <Text style={styles.viewOriginal}>View original post ↗</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.engCol}>
                    <Text style={styles.viralIcon}>👾</Text>
                    <Text style={styles.viralScore}>{Math.round(item.engagementRate)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </Card>
        </HighlightGlow>

        {/* Generate Script button — only active when a reel is selected */}
        <TouchableOpacity
          style={[styles.generateBtn, !selectedUrl && styles.generateBtnDisabled]}
          onPress={handleGenerateScript}
          disabled={!selectedUrl || adaptLoading}
          activeOpacity={0.7}
        >
          {adaptLoading && selectedUrl ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.generateBtnText, !selectedUrl && styles.generateBtnTextDisabled]}>
              {selectedUrl ? "Generate Script" : "Select a reel above"}
            </Text>
          )}
        </TouchableOpacity>

        {/* Generated Script — inline, editable */}
        {showScript && editableScript && (
          <Card>
            <View style={styles.scriptHeader}>
              <Text style={styles.cardTitle}>YOUR SCRIPT</Text>
              {!isEditing ? (
                <TouchableOpacity onPress={() => setIsEditing(true)}>
                  <Text style={styles.editLink}>Edit</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleSaveScript}>
                  <Text style={styles.saveLink}>Save & Copy</Text>
                </TouchableOpacity>
              )}
            </View>

            {selectedItem && (
              <Text style={styles.basedOn} numberOfLines={1}>
                Based on: {selectedItem.title}
              </Text>
            )}

            {isEditing ? (
              <TextInput
                style={styles.scriptInput}
                value={editableScript}
                onChangeText={setEditableScript}
                multiline
                textAlignVertical="top"
                autoFocus
              />
            ) : (
              <TouchableOpacity onPress={() => setIsEditing(true)} activeOpacity={0.8}>
                <Text style={styles.scriptText}>{editableScript}</Text>
                <Text style={styles.tapToEdit}>Tap to edit</Text>
              </TouchableOpacity>
            )}

            {/* Save button at bottom */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveScript}>
              <Text style={styles.saveBtnText}>
                {isEditing ? "Save & Copy to Clipboard" : "Copy to Clipboard"}
              </Text>
            </TouchableOpacity>
          </Card>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1923" },
  scroll: { flex: 1, paddingHorizontal: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: "#9CA3AF", fontSize: 14 },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 16 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  location: { fontSize: 13, color: "#9CA3AF" },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  streakIcon: { fontSize: 20 },
  streakNum: { fontSize: 18, fontWeight: "700", color: "#F97316" },
  streakLabel: { fontSize: 11, color: "#6B7280" },
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
  viralityLabel: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  // Reel rows with radio selection
  reelRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#2a3a4e",
    gap: 10,
  },
  reelRowSelected: {
    backgroundColor: "rgba(249,115,22,0.08)",
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderBottomColor: "transparent",
  },
  reelRadio: { justifyContent: "center" },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#2a3a4e",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterActive: { borderColor: "#F97316" },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#F97316" },
  reelContent: { flex: 1 },
  reelTitle: { fontSize: 14, fontWeight: "600", color: "#fff" },
  reelMeta: { fontSize: 11, color: "#6B7280", marginTop: 3 },
  viewOriginal: { fontSize: 11, color: "#60A5FA", marginTop: 4, fontWeight: "600" },
  engCol: { alignItems: "center", gap: 2 },
  viralIcon: { fontSize: 16 },
  viralScore: { color: "#4ADE80", fontSize: 14, fontWeight: "700" },
  // Generate button
  generateBtn: {
    backgroundColor: "#F97316",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 12,
  },
  generateBtnDisabled: {
    backgroundColor: "#1a2636",
    borderWidth: 1,
    borderColor: "#2a3a4e",
  },
  generateBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  generateBtnTextDisabled: { color: "#6B7280" },
  // Script section
  scriptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  editLink: { color: "#60A5FA", fontSize: 13, fontWeight: "600" },
  saveLink: { color: "#4ADE80", fontSize: 13, fontWeight: "600" },
  basedOn: { fontSize: 11, color: "#6B7280", marginBottom: 10 },
  scriptText: { fontSize: 14, color: "#E5E7EB", lineHeight: 22 },
  tapToEdit: { fontSize: 11, color: "#6B7280", marginTop: 6, fontStyle: "italic" },
  scriptInput: {
    fontSize: 14,
    color: "#E5E7EB",
    lineHeight: 22,
    backgroundColor: "#0F1923",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F97316",
    minHeight: 150,
  },
  saveBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F97316",
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
