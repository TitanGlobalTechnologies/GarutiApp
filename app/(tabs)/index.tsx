import { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Image,
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
  LayoutAnimation,
  UIManager,
} from "react-native";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Ionicons } from "@expo/vector-icons";
import SafeArea from "../../components/SafeArea";
import { useAuthContext } from "../../src/providers/AuthProvider";
import { useUI } from "../../src/providers/UIProvider";
import { useDigest } from "../../src/hooks/useDigest";
import { useAdaptations } from "../../src/hooks/useAdaptations";
import { getDigestForCity } from "../../src/data/live-digest";
import { SUPPORTED_CITIES } from "../../src/data/swfl-zipcodes";
import type { SupportedCity } from "../../src/data/swfl-zipcodes";
import type { ContentPlatform } from "../../src/types/database";

/** Cities ordered by proximity from each home city */
const CITY_PROXIMITY: Record<string, string[]> = {
  "Cape Coral": ["Cape Coral", "Fort Myers", "Lehigh Acres", "Punta Gorda", "Bonita Springs", "Naples"],
  "Fort Myers": ["Fort Myers", "Cape Coral", "Lehigh Acres", "Bonita Springs", "Punta Gorda", "Naples"],
  "Naples": ["Naples", "Bonita Springs", "Fort Myers", "Cape Coral", "Lehigh Acres", "Punta Gorda"],
  "Bonita Springs": ["Bonita Springs", "Naples", "Fort Myers", "Cape Coral", "Lehigh Acres", "Punta Gorda"],
  "Lehigh Acres": ["Lehigh Acres", "Fort Myers", "Cape Coral", "Bonita Springs", "Punta Gorda", "Naples"],
  "Punta Gorda": ["Punta Gorda", "Cape Coral", "Fort Myers", "Lehigh Acres", "Bonita Springs", "Naples"],
};

function getNearbyCities(homeCity: string): string[] {
  return CITY_PROXIMITY[homeCity] || [homeCity, ...SUPPORTED_CITIES.filter(c => c !== homeCity)];
}

function formatViews(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

function formatDate(dateStr?: string): { label: string; fresh: boolean } {
  if (!dateStr) return { label: "", fresh: false };
  // Compare dates only (no time), using local midnight
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split("T")[0];
  const postDate = dateStr.slice(0, 10);

  if (postDate === todayStr) return { label: "Today", fresh: true };
  if (postDate === yesterdayStr) return { label: "Yesterday", fresh: true };
  const d = new Date(postDate + "T12:00:00");
  return { label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), fresh: false };
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

/** Instagram SVG icon as data URI — renders reliably on web without icon fonts */
const IG_ICON_SVG = (color: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`)}`;

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
  const iconColor = selected
    ? "#E1306C"
    : "rgba(255,255,255,0.7)";

  // Plain <a> tag with ?igsh=1 to bypass iOS Universal Links
  // Without this param, iOS opens Instagram app which redirects to feed/wrong reel
  // With ?igsh=1, it opens in the browser and shows the correct post
  if (Platform.OS === "web") {
    const safeUrl = url.includes("?") ? url + "&igsh=1" : url + "?igsh=1";
    return (
      <View
        style={styles.platformBtn}
        accessibilityLabel={`Open on ${platform}`}
        accessibilityRole="link"
      >
        <a
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClickCapture={(e: any) => e.stopPropagation()}
          onTouchEndCapture={(e: any) => e.stopPropagation()}
          onTouchStartCapture={(e: any) => e.stopPropagation()}
          onMouseDownCapture={(e: any) => e.stopPropagation()}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <Image
            source={{ uri: IG_ICON_SVG(iconColor) }}
            style={{ width: 22, height: 22 }}
            resizeMode="contain"
          />
        </a>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={(e) => {
        e.stopPropagation();
        const safeUrl = url.includes("?") ? url + "&igsh=1" : url + "?igsh=1";
        Linking.openURL(safeUrl);
      }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.6}
      style={styles.platformBtn}
      accessibilityLabel={`Open on ${platform}`}
      accessibilityRole="link"
    >
      <Image
        source={{ uri: IG_ICON_SVG(iconColor) }}
        style={{ width: 22, height: 22 }}
        resizeMode="contain"
      />
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


  // City carousel — nearby cities ordered by proximity
  const nearbyCities = getNearbyCities(marketCity);
  const [activeCityTab, setActiveCityTab] = useState(marketCity);

  function handleChangeCity() {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.localStorage.removeItem("lae_zipcode");
      window.localStorage.removeItem("lae_city");
      window.location.reload();
    }
  }

  const mapDigestItem = (item: any) => ({
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
    discoveredAt: item.postDate || new Date().toISOString().split("T")[0],
  });

  // Build content for each scope level
  const cityContent = activeCityTab === marketCity
    ? content
    : getDigestForCity(activeCityTab as SupportedCity).map(mapDigestItem);
  const floridaContent = getDigestForCity("Florida").map(mapDigestItem);
  const usaContent = getDigestForCity("USA").map(mapDigestItem);

  // Active content based on tab — with LayoutAnimation for smooth transitions
  const activeContent = useMemo(() => {
    return activeTab === "city"
      ? cityContent
      : activeTab === "state"
      ? floridaContent
      : usaContent;
  }, [activeTab, activeCityTab, cityContent, floridaContent, usaContent]);

  // ── Tab scroll-into-view: smooth center on tap ──
  const tabScrollRef = useRef<ScrollView>(null);
  const tabLayouts = useRef<Record<number, { x: number; width: number }>>({});
  const tabBarWidth = useRef(390); // measured from the actual container

  const scrollTabIntoView = (index: number) => {
    const layout = tabLayouts.current[index];
    if (!layout || !tabScrollRef.current) return;
    // Center the tab in the visible container
    const scrollX = layout.x - (tabBarWidth.current / 2) + (layout.width / 2);
    tabScrollRef.current.scrollTo({ x: Math.max(0, scrollX), animated: true });
  };

  // Track previous tab to determine animation direction (expanding vs contracting)
  const prevTabRef = useRef<ScopeTab>(activeTab);
  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      LayoutAnimation.configureNext({
        duration: 350,
        create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
        update: { type: LayoutAnimation.Types.easeInEaseOut },
        delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      });
      prevTabRef.current = activeTab;
    }
  }, [activeTab]);

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

  // Check if selected post has a real script (not b-roll)
  const selectedHasScript = useMemo(() => {
    if (!selectedUrl) return false;
    const item = activeContent.find(c => c.url === selectedUrl);
    if (!item) return false;
    // Check the script in the digest data
    const allScopes = ["Cape Coral", "Fort Myers", "Naples", "Bonita Springs", "Lehigh Acres", "Punta Gorda", "Florida", "USA"] as const;
    for (const scope of allScopes) {
      const items = getDigestForCity(scope);
      const match = items.find(d => d.url === selectedUrl);
      if (match) {
        if ((match as any).hasSpeech === false) return false;
        if (!match.script || match.script.length < 50 || match.script.startsWith("[Script")) return false;
        return true;
      }
    }
    return adaptations.length > 0;
  }, [selectedUrl, activeContent, adaptations]);

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
        {/* Change city button */}
        <TouchableOpacity style={styles.changeCityBtn} onPress={handleChangeCity} activeOpacity={0.7}>
          <Ionicons name="swap-horizontal" size={14} color="rgba(255,255,255,0.45)" />
          <Text style={styles.changeCityText}>Change city</Text>
        </TouchableOpacity>

        {/* Scope tabs — horizontally scrollable */}
        <View style={styles.tabRowWrapper}>
          <ScrollView
            ref={tabScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabRowScroll}
            onLayout={(e) => { tabBarWidth.current = e.nativeEvent.layout.width; }}
          >
            {([
              { key: "nation" as ScopeTab, label: "USA", city: null },
              { key: "state" as ScopeTab, label: "Florida", city: null },
              ...nearbyCities.map((c) => ({ key: "city" as ScopeTab, label: c, city: c })),
            ]).map((tab, i) => {
              const isActive = tab.city
                ? activeTab === "city" && activeCityTab === tab.city
                : activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.city || tab.key}
                  style={[styles.tab, isActive && styles.tabActive]}
                  onLayout={(e) => {
                    tabLayouts.current[i] = { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width };
                  }}
                  onPress={() => {
                    scrollTabIntoView(i);
                    LayoutAnimation.configureNext({
                      duration: 350,
                      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
                      update: { type: LayoutAnimation.Types.easeInEaseOut },
                      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
                    });
                    setActiveTab(tab.key);
                    if (tab.city) setActiveCityTab(tab.city);
                    setSelectedUrl(null);
                    setShowScript(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {/* Fade hint on right edge */}
          <View
            style={[styles.tabFadeHint, Platform.OS === "web" ? { backgroundImage: "linear-gradient(to right, transparent, #0A0A0F)" } as any : { backgroundColor: "transparent" }]}
            pointerEvents="none"
          />
        </View>

        {/* Content — same rendering for all tabs */}
        {activeContent.length > 0 && (
          <>
            {activeContent.map((item, idx) => {
              const isSelected = selectedUrl === item.url;
              return (
                <PressableCard
                  key={`${activeTab}-${activeCityTab}-${item.url}`}
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
                      <Text style={styles.postAuthor} numberOfLines={1}>@{(item.creatorHandle || "").slice(0, 16)}</Text>
                      <Text style={styles.postDot}>·</Text>
                      <Text style={styles.postViews}>
                        {formatViews(item.views || item.likes)} {item.views ? "views" : "likes"}
                      </Text>
                      {item.discoveredAt && item.discoveredAt.match(/^\d{4}-\d{2}-\d{2}/) && (() => {
                        const { label, fresh } = formatDate(item.discoveredAt);
                        if (!label) return null;
                        return (
                          <>
                            <Text style={styles.postDot}>·</Text>
                            <Text style={[styles.postDate, fresh && styles.postDateFresh]}>{label}</Text>
                          </>
                        );
                      })()}
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

            {/* Generate button — only active if selected post has real speech/script */}
            <Pressable
              style={({ pressed }) => [
                styles.generateBtn,
                (!selectedUrl || !selectedHasScript) && styles.generateBtnDisabled,
                pressed && selectedHasScript ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : {},
              ]}
              onPress={handleGenerateScript}
              disabled={!selectedUrl || !selectedHasScript || adaptLoading}
            >
              {adaptLoading && selectedUrl ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.generateBtnText, (!selectedUrl || !selectedHasScript) && styles.generateBtnTextDisabled]}>
                  {!selectedUrl ? "Select a post above" : !selectedHasScript ? "No speech to script" : "Generate Script"}
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

  // Change city
  changeCityBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    marginTop: 12,
    marginBottom: 12,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  changeCityText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    fontWeight: "500",
  },

  // Tabs
  tabRowWrapper: {
    position: "relative",
    marginBottom: 20,
  },
  tabRowScroll: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 24,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 18,
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
  tabFadeHint: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 32,
  },

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
  postAuthor: { fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: "500", maxWidth: 120 },
  postDot: { fontSize: 12, color: "rgba(255,255,255,0.2)" },
  postViews: { fontSize: 12, color: "rgba(255,255,255,0.35)" },
  postDate: { fontSize: 12, color: "rgba(255,255,255,0.3)", fontStyle: "italic" as const },
  postDateFresh: { color: "#4ADE80", fontWeight: "600" as const, fontStyle: "normal" as const },
  installBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.3)",
  },
  installTitle: { color: "#F97316", fontSize: 14, fontWeight: "700" as const, marginBottom: 2 },
  installText: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
  installBtn: {
    backgroundColor: "#F97316",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  installBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" as const },
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
