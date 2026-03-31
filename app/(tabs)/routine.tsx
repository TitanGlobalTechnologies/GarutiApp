import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import SafeArea from "../../components/SafeArea";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import ProgressBar from "../../components/ProgressBar";
import StepItem from "../../components/StepItem";
import CTAButton from "../../components/CTAButton";
import { useRoutine } from "../../src/hooks/useRoutine";
import { useRoutineHighlight } from "../../src/providers/RoutineProvider";
import { useUI } from "../../src/providers/UIProvider";
import { MOCK_DIGEST_CONTENT } from "../../src/data/mock-digest";

export default function RoutineScreen() {
  const router = useRouter();
  const { showToast } = useUI();
  const { setHighlight } = useRoutineHighlight();
  const {
    steps,
    currentStep,
    intention,
    totalMinutes,
    completedMinutes,
    progress,
    completeStep,
    resetRoutine,
    isComplete,
  } = useRoutine();

  // Each step navigates to the relevant screen and highlights the target area
  function handleStepTap(stepId: number) {
    const step = steps.find((s) => s.id === stepId);
    if (!step) return;

    // Complete the step
    completeStep(stepId);

    // Navigate to the right place with a highlight cue
    switch (stepId) {
      case 1: // Open today's digest
        setHighlight("digest-screen", 3000);
        router.push("/(tabs)");
        break;

      case 2: // Pick your Reel for today
        setHighlight("digest-reels-list", 3500);
        router.push("/(tabs)");
        break;

      case 3: // Customize your adaptation
        setHighlight("adaptation-versions", 3500);
        // Navigate to the first post's adaptation screen
        if (MOCK_DIGEST_CONTENT[0]) {
          router.push({
            pathname: "/adaptation/[url]",
            params: {
              url: encodeURIComponent(MOCK_DIGEST_CONTENT[0].url),
              title: MOCK_DIGEST_CONTENT[0].title,
            },
          });
        }
        break;

      case 4: // Post it
        setHighlight("adaptation-post-button", 3500);
        if (MOCK_DIGEST_CONTENT[0]) {
          router.push({
            pathname: "/adaptation/[url]",
            params: {
              url: encodeURIComponent(MOCK_DIGEST_CONTENT[0].url),
              title: MOCK_DIGEST_CONTENT[0].title,
            },
          });
        }
        break;

      case 5: // Log yesterday's conversations
        setHighlight("tracker-log-button", 3500);
        router.push("/(tabs)/tracker");
        break;

      case 6: // See streak + weekly focus
        setHighlight("focus-screen", 3000);
        router.push("/(tabs)/focus");
        showToast({ message: "🎉 Routine Complete! See you tomorrow.", type: "success", duration: 3000 });
        break;
    }
  }

  return (
    <SafeArea style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header with timer */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Morning Routine</Text>
          <View style={styles.timerCol}>
            <Text style={styles.timerValue}>{completedMinutes}</Text>
            <Text style={styles.timerLabel}>of {totalMinutes} min</Text>
          </View>
        </View>

        <ProgressBar progress={progress} color="#F97316" />
        <View style={{ height: 16 }} />

        {/* Steps checklist — each step is tappable and navigates */}
        <Card>
          {steps.map((step) => (
            <TouchableOpacity
              key={step.id}
              onPress={() => handleStepTap(step.id)}
              activeOpacity={0.6}
            >
              <StepItem
                title={step.title}
                description={step.description}
                status={step.status}
                stepNumber={step.id}
              />
            </TouchableOpacity>
          ))}
        </Card>

        {/* Today's Intention */}
        <Card>
          <Text style={styles.cardTitle}>TODAY'S INTENTION</Text>
          <View style={styles.intentionBox}>
            <Text style={styles.intentionText}>"{intention}"</Text>
          </View>
        </Card>

        {/* Completed state */}
        {isComplete && (
          <Card borderLeftColor="#4ADE80">
            <View style={styles.completeRow}>
              <Text style={styles.completeIcon}>🎉</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.completeTitle}>Routine Complete!</Text>
                <Text style={styles.completeDesc}>
                  All 6 steps done. Your streak is safe. See you tomorrow!
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.resetBtn} onPress={resetRoutine}>
              <Text style={styles.resetBtnText}>Reset for Testing</Text>
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#fff" },
  timerCol: { alignItems: "flex-end" },
  timerValue: { fontSize: 22, fontWeight: "700", color: "#F97316" },
  timerLabel: { fontSize: 10, color: "#6B7280" },
  cardTitle: {
    fontSize: 13, fontWeight: "600", color: "#9CA3AF",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
  },
  intentionBox: {
    backgroundColor: "#0F1923",
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: "#F97316",
  },
  intentionText: {
    fontSize: 14, color: "#E5E7EB", fontStyle: "italic", lineHeight: 22,
  },
  completeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  completeIcon: { fontSize: 32 },
  completeTitle: { fontSize: 16, fontWeight: "700", color: "#4ADE80" },
  completeDesc: { fontSize: 13, color: "#9CA3AF", marginTop: 2, lineHeight: 18 },
  resetBtn: {
    marginTop: 12, paddingVertical: 8,
    alignItems: "center", borderTopWidth: 1, borderTopColor: "#2a3a4e",
  },
  resetBtnText: { color: "#6B7280", fontSize: 12 },
});
