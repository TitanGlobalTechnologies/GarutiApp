import { useState, useRef } from "react";
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
  Animated,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SafeArea from "../../components/SafeArea";
import { useAuthContext } from "../../src/providers/AuthProvider";
import { useUI } from "../../src/providers/UIProvider";
import { useDigest } from "../../src/hooks/useDigest";
import { useAdaptations } from "../../src/hooks/useAdaptations";
import { getDigestForCity } from "../../src/data/live-digest";
import type { SupportedCity } from "../../src/data/swfl-zipcodes";
import type { ContentPlatform } from "../../src/types/database";

function formatViews(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = dateStr.length === 10 ? new Date(dateStr + "T12:00:00") : new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatScore(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 10000) return (n / 1000).toFixed(0) + "K";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(Math.round(n));
}

/** Maps a ContentPlatform to its Ionicons logo glyph name */
const PLATFORM_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  instagram: "logo-instagram",
  youtube: "logo-youtube",
  tiktok: "logo-tiktok",
  facebook: "logo-facebook",
  twitter: "logo-twitter",
  reddit: "logo-reddit",
};

/** Small platform icon button that opens the original post URL */
function PlatformLinkButton({
  platform,
  url,
  selected,
}: {
  platform: ContentPlatform | string;
  url: string;
  selected: boolean;
}) {
  const iconName = PLATFORM_ICON_MAP[platform] || "link-outline";
  const iconColor = selected
    ? "rgba(255,255,255,0.50)"
    : "rgba(255,255,255,0.28)";

  return (
    <TouchableOpacity
      onPress={(e) => {
        e.stopPropagation();
        Linking.openURL(url);
      }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.6}
      style={styles.platformBtn}
      accessibilityLabel={`Open on ${platform}`}
      accessibilityRole="link"
    >
      <Ionicons name={iconName as any} size={18} color={iconColor} />
    </TouchableOpacity>
  );
}

type ScopeTab = "city" | "state" | "nation";

/** Pressable card with scale-down animation on press */
function PressableCard({
  children,
  onPress,
  selected,
}: {
  children: React.ReactNode;
  onPress: () => void;
  selected: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View
        style={[
          styles.postCard,
          selected && styles.postCardSelected,
          { transform: [{ scale }] },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

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

  // Get Florida and USA content
  const floridaContent = getDigestForCity("Florida");
  const usaContent = getDigestForCity("USA");

  // Active content based on tab
  const activeContent = activeTab === "city" ? content
    : activeTab === "state" ? floridaContent.map(item => ({
        url: item.url,
        title: item.title,
        caption: item.caption,
        platform: "instagram" as const,
        creatorHandle: item.authorHandle,
        creatorName: item.authorHandle,
        thumbnail: "",
        views: item.views,
        likes: item.likes,
        comments: item.comments,
        engagementRate: item.viralityScore,
        discoveredAt: new Date().toISOString(),
      }))
    : usaContent.map(item => ({
        url: item.url,
        title: item.title,
        caption: item.caption,
        platform: "instagram" as const,
        creatorHandle: item.authorHandle,
        creatorName: item.authorHandle,
        thumbnail: "",
        views: item.views,
        likes: item.likes,
        comments: item.comments,
        engagementRate: item.viralityScore,
        discoveredAt: new Date().toISOString(),
      }));

  // Always pass user's city for script lookup — state/nation scripts
  // are localized to the user's city (e.g., Texas post → Cape Coral script)
  const { adaptations, loading: adaptLoading } = useAdaptations(
    selectedUrl || "",
    marketCity,
    contentStyle,
    activeTab !== "city" ? activeTab : undefined, // scope hint for state/nation
  );

  function handleSelectReel(url: string) {
    setSelectedUrl(selectedUrl === url ? null : url);
    setShowScript(false);
    setEditableScript("");
    setIsEditing(false);
  }

  function handleGenerateScript() {
    if (!selectedUrl || adaptations.length === 0) return;
    setEditableScript(adaptations[0]?.fullScript || "");
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
      message: copied ? "Copied to clipboard" : "Script saved",
      type: "success",
      duration: 2000,
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

        {/* Scope tabs */}
        <View style={styles.tabRow}>
          {([
            { key: "nation" as ScopeTab, label: "USA" },
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

        {/* Content — same rendering for all tabs */}
        {activeContent.length > 0 && (
          <>
            {activeContent.map((item) => {
              const isSelected = selectedUrl === item.url;
              return (
                <PressableCard
                  key={item.url}
                  onPress={() => handleSelectReel(item.url)}
                  selected={isSelected}
                >
                  {/* Row 1: Title + Virality badge */}
                  <View style={styles.postTop}>
                    <Text style={[styles.postTitle, isSelected && styles.postTitleSelected]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View style={[styles.viralBadge, isSelected && styles.viralBadgeSelected]}>
                      <Text style={styles.viralIcon}>👾</Text>
                      <Text style={[styles.viralScore, isSelected && styles.viralScoreSelected]}>
                        {formatScore(item.engagementRate)}
                      </Text>
                    </View>
                  </View>

                  {/* Row 2: @handle + views (left) · platform icon (right) */}
                  <View style={styles.postBottom}>
                    <View style={styles.postMeta}>
                      <Text style={styles.postAuthor}>@{item.creatorHandle}</Text>
                      <Text style={styles.postDot}>·</Text>
                      <Text style={styles.postViews}>
                        {formatViews(item.views || item.likes)} {item.views ? "views" : "likes"}
                      </Text>
                      {item.discoveredAt && item.discoveredAt.match(/^\d{4}-\d{2}-\d{2}/) && (
                        <>
                          <Text style={styles.postDot}>·</Text>
                          <Text style={styles.postDate}>{formatDate(item.discoveredAt)}</Text>
                        </>
                      )}
                    </View>
                    <PlatformLinkButton
                      platform={item.platform}
                      url={item.url}
                      selected={isSelected}
                    />
                  </View>
                </PressableCard>
              );
            })}

            {/* Generate button */}
            <Pressable
              style={({ pressed }) => [
                styles.generateBtn,
                !selectedUrl && styles.generateBtnDisabled,
                pressed && selectedUrl ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : {},
              ]}
              onPress={handleGenerateScript}
              disabled={!selectedUrl || adaptLoading}
            >
              {adaptLoading && selectedUrl ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.generateBtnText, !selectedUrl && styles.generateBtnTextDisabled]}>
                  {selectedUrl ? "Generate Script" : "Select a post above"}
                </Text>
              )}
            </Pressable>

            {/* Script */}
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
                      <Text style={styles.saveLink}>Save</Text>
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
                  </TouchableOpacity>
                )}

                <Pressable
                  style={({ pressed }) => [
                    styles.copyBtn,
                    pressed ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : {},
                  ]}
                  onPress={handleSaveScript}
                >
                  <Text style={styles.copyBtnText}>Copy to Clipboard</Text>
                </Pressable>
              </View>
            )}
          </>
        )}


        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F" },
  scroll: { flex: 1, paddingHorizontal: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
  cityName: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.55)",
    marginTop: 12,
    marginBottom: 16,
    letterSpacing: 0.3,
  },

  // Tabs
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  tabActive: {
    backgroundColor: "#F97316",
    borderColor: "#F97316",
  },
  tabText: {
    color: "rgba(255,255,255,0.55)",
    fontWeight: "600",
    fontSize: 13,
  },
  tabTextActive: { color: "#fff" },

  // Post cards
  postCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  postCardSelected: {
    borderColor: "#F97316",
    backgroundColor: "rgba(249,115,22,0.06)",
  },
  postTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  postTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.92)",
    lineHeight: 21,
    flex: 1,
    letterSpacing: -0.2,
  },
  postTitleSelected: { color: "#F97316" },
  viralBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  viralBadgeSelected: {
    backgroundColor: "rgba(249,115,22,0.12)",
    borderColor: "rgba(249,115,22,0.2)",
  },
  viralIcon: { fontSize: 13 },
  viralScore: {
    color: "rgba(74,222,128,0.9)",
    fontSize: 13,
    fontWeight: "700",
  },
  viralScoreSelected: { color: "#4ADE80" },
  postBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  postMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  postAuthor: { fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: "500" },
  postDot: { fontSize: 12, color: "rgba(255,255,255,0.2)" },
  postViews: { fontSize: 12, color: "rgba(255,255,255,0.35)" },
  postDate: { fontSize: 12, color: "rgba(255,255,255,0.3)", fontStyle: "italic" as const },
  platformBtn: {
    padding: 4,
    marginLeft: 8,
  },

  // Generate button
  generateBtn: {
    backgroundColor: "#F97316",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  generateBtnDisabled: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  generateBtnText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: -0.2 },
  generateBtnTextDisabled: { color: "rgba(255,255,255,0.3)" },

  // Script
  scriptCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  scriptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  scriptLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  editLink: { color: "rgba(96,165,250,0.8)", fontSize: 13, fontWeight: "600" },
  saveLink: { color: "#4ADE80", fontSize: 13, fontWeight: "600" },
  scriptText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 23,
    letterSpacing: -0.1,
  },
  scriptInput: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 23,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.4)",
    minHeight: 160,
  },
  copyBtn: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F97316",
    alignItems: "center",
  },
  copyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15, letterSpacing: -0.2 },

  // Coming soon
  comingSoon: {
    alignItems: "center",
    paddingVertical: 80,
  },
  comingSoonIcon: { fontSize: 48, marginBottom: 20 },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "rgba(255,255,255,0.92)",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  comingSoonText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    lineHeight: 21,
  },
});
