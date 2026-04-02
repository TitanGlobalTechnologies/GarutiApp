import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  Linking,
} from "react-native";
import SafeArea from "../../components/SafeArea";
import { useAuthContext } from "../../src/providers/AuthProvider";
import { useUI } from "../../src/providers/UIProvider";
import { useDigest } from "../../src/hooks/useDigest";
import { useAdaptations } from "../../src/hooks/useAdaptations";

function formatViews(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

type ScopeTab = "city" | "state" | "nation";

export default function DigestScreen() {
  const { profile } = useAuthContext();
  const { showToast } = useUI();
  const marketCity = profile?.market_city || "Cape Coral";
  const marketState = profile?.market_state || "FL";
  const contentStyle = profile?.content_style || undefined;
  const { content, loading, refresh } = useDigest(marketCity, marketState);

  const [activeTab, setActiveTab] = useState<ScopeTab>("city");
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [showScript, setShowScript] = useState(false);
  const [editableScript, setEditableScript] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const { adaptations, loading: adaptLoading } = useAdaptations(
    selectedUrl || "",
    marketCity,
    contentStyle
  );

  // TODO: State and Nation content will come from broader scrapes
  // For now, city shows real data, state/nation show coming soon
  const isLive = activeTab === "city";

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
        {/* City name */}
        <Text style={styles.cityName}>{marketCity}, {marketState}</Text>

        {/* Scope tabs: City / State / Nation */}
        <View style={styles.tabRow}>
          {([
            { key: "nation" as ScopeTab, label: "Nation" },
            { key: "state" as ScopeTab, label: "Florida" },
            { key: "city" as ScopeTab, label: marketCity },
          ]).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => {
                setActiveTab(tab.key);
                setSelectedUrl(null);
                setShowScript(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content area */}
        {activeTab === "city" && content.length > 0 && (
          <>
            {content.map((item) => {
              const isSelected = selectedUrl === item.url;
              return (
                <TouchableOpacity
                  key={item.url}
                  onPress={() => handleSelectReel(item.url)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.postCard, isSelected && styles.postCardSelected]}>
                    <View style={styles.postHeader}>
                      <View style={styles.postRadio}>
                        <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                      </View>
                      <View style={styles.viralBadge}>
                        <Text style={styles.viralIcon}>👾</Text>
                        <Text style={styles.viralScore}>{Math.round(item.engagementRate)}</Text>
                      </View>
                    </View>
                    <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.postMeta}>
                      <Text style={styles.postAuthor}>@{item.creatorHandle}</Text>
                      <Text style={styles.postDot}>·</Text>
                      <Text style={styles.postViews}>{formatViews(item.views || item.likes)} {item.views ? "views" : "likes"}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); Linking.openURL(item.url); }}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <Text style={styles.viewOriginal}>View original post</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Generate Script button */}
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
                  {selectedUrl ? "Generate Script" : "Select a post above"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Script display */}
            {showScript && editableScript && (
              <View style={styles.scriptCard}>
                <View style={styles.scriptHeader}>
                  <Text style={styles.scriptLabel}>YOUR SCRIPT</Text>
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

                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveScript}>
                  <Text style={styles.saveBtnText}>
                    {isEditing ? "Save & Copy to Clipboard" : "Copy to Clipboard"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* State tab */}
        {activeTab === "state" && (
          <View style={styles.comingSoon}>
            <Text style={styles.comingSoonIcon}>🌴</Text>
            <Text style={styles.comingSoonTitle}>Florida's Top Posts</Text>
            <Text style={styles.comingSoonText}>
              The most viral real estate content from across Florida. Coming soon.
            </Text>
          </View>
        )}

        {/* Nation tab */}
        {activeTab === "nation" && (
          <View style={styles.comingSoon}>
            <Text style={styles.comingSoonIcon}>🇺🇸</Text>
            <Text style={styles.comingSoonTitle}>Nationwide Top Posts</Text>
            <Text style={styles.comingSoonText}>
              The most viral real estate content from across the country. Coming soon.
            </Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1923" },
  scroll: { flex: 1, paddingHorizontal: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  // Header
  cityName: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 8,
    marginBottom: 12,
  },
  // Scope tabs
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#1a2636",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a3a4e",
  },
  tabActive: {
    backgroundColor: "#F97316",
    borderColor: "#F97316",
  },
  tabText: { color: "#9CA3AF", fontWeight: "600", fontSize: 13 },
  tabTextActive: { color: "#fff" },
  // Post cards
  postCard: {
    backgroundColor: "#1a2636",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#2a3a4e",
  },
  postCardSelected: {
    borderColor: "#F97316",
    backgroundColor: "rgba(249,115,22,0.06)",
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  postRadio: {},
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
  viralBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0F1923",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  viralIcon: { fontSize: 14 },
  viralScore: { color: "#4ADE80", fontSize: 14, fontWeight: "700" },
  postTitle: { fontSize: 15, fontWeight: "600", color: "#fff", lineHeight: 21 },
  postMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  postAuthor: { fontSize: 12, color: "#9CA3AF" },
  postDot: { fontSize: 12, color: "#6B7280" },
  postViews: { fontSize: 12, color: "#6B7280" },
  viewOriginal: { fontSize: 12, color: "#60A5FA", marginTop: 8, fontWeight: "600" },
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
  // Script
  scriptCard: {
    backgroundColor: "#1a2636",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2a3a4e",
  },
  scriptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  scriptLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  editLink: { color: "#60A5FA", fontSize: 13, fontWeight: "600" },
  saveLink: { color: "#4ADE80", fontSize: 13, fontWeight: "600" },
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
  // Coming soon
  comingSoon: {
    alignItems: "center",
    paddingVertical: 60,
  },
  comingSoonIcon: { fontSize: 48, marginBottom: 16 },
  comingSoonTitle: { fontSize: 18, fontWeight: "700", color: "#fff", marginBottom: 8 },
  comingSoonText: { fontSize: 14, color: "#9CA3AF", textAlign: "center", lineHeight: 20 },
});
