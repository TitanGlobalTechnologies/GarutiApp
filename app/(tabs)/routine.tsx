import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import SafeArea from "../../components/SafeArea";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import ProgressBar from "../../components/ProgressBar";
import StepItem from "../../components/StepItem";
import CTAButton from "../../components/CTAButton";
import { useRoutine } from "../../src/hooks/useRoutine";

export default function RoutineScreen() {
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

  return (
    <SafeArea style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header with timer */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Morning Routine</Text>
          <View style={styles.timerCol}>
            <Text style={styles.timerValue}>
              {completedMinutes}:{((completedMinutes % 1) * 60).toFixed(0).padStart(2, "0")}
            </Text>
            <Text style={styles.timerLabel}>of {totalMinutes} min</Text>
          </View>
        </View>

        <ProgressBar progress={progress} color="#F97316" />
        <View style={{ height: 16 }} />

        {/* Steps checklist */}
        <Card>
          {steps.map((step) => (
            <TouchableOpacity
              key={step.id}
              onPress={() => {
                if (step.status === "current") {
                  completeStep(step.id);
                }
              }}
              disabled={step.status === "pending"}
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

        {/* Active Step Detail */}
        {currentStep && !isComplete && (
          <Card>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>ACTIVE STEP: {currentStep.title.toUpperCase()}</Text>
              <Badge label="Now" variant="orange" />
            </View>
            {currentStep.id === 4 && (
              <>
                <Text style={styles.activeDesc}>
                  Your adapted script is ready. Record a 30-60 second Reel using this hook:
                </Text>
                <View style={styles.hookBox}>
                  <Text style={styles.hookText}>
                    "Everyone's talking about Cape Coral flooding — here's what nobody tells you
                    about the NEW construction zones..."
                  </Text>
                </View>
                <CTAButton
                  label="Mark as Posted ✓"
                  onPress={() => {
                    completeStep(4);
                    Alert.alert("Posted!", "Great job! Moving to next step.");
                  }}
                />
              </>
            )}
            {currentStep.id === 5 && (
              <>
                <Text style={styles.activeDesc}>
                  Open your conversation tracker and log any DMs, comments, or calls from yesterday.
                </Text>
                <CTAButton
                  label="Open Tracker"
                  onPress={() => completeStep(5)}
                />
              </>
            )}
            {currentStep.id === 6 && (
              <>
                <Text style={styles.activeDesc}>
                  Check your streak and review this week's focus area.
                </Text>
                <CTAButton
                  label="Complete Routine ✓"
                  onPress={() => {
                    completeStep(6);
                    Alert.alert("🎉 Routine Complete!", "Great work! See you tomorrow morning.");
                  }}
                />
              </>
            )}
          </Card>
        )}

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
  cardHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 10,
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
  activeDesc: {
    fontSize: 13, color: "#E5E7EB", lineHeight: 20, marginBottom: 10,
  },
  hookBox: {
    backgroundColor: "#0F1923",
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  hookText: {
    fontSize: 14, fontWeight: "600", color: "#FBBF24", lineHeight: 20,
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
