import "../global.css";
import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuthContext } from "../src/providers/AuthProvider";
import { ConversationsProvider } from "../src/providers/ConversationsProvider";
import { UIProvider } from "../src/providers/UIProvider";
import { RoutineProvider } from "../src/providers/RoutineProvider";
import PhoneFrame from "../components/PhoneFrame";
import ZipOnboarding from "../components/ZipOnboarding";

function RootNavigator() {
  const { session, loading, isDemoMode } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    setIsReady(true);
  }, [loading]);

  useEffect(() => {
    if (!isReady) return;

    if (isDemoMode) {
      const inTabs = segments[0] === "(tabs)";
      if (!inTabs && segments[0] !== "adaptation" && segments[0] !== "conversation" && segments[0] !== "subscription" && segments[0] !== "settings") {
        router.replace("/(tabs)");
      }
      return;
    }

    const inAuthGroup = segments[0] === "auth";

    if (!session && !inAuthGroup) {
      router.replace("/auth/welcome");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, segments, isReady, isDemoMode]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

function getStoredZip(): string | null {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.localStorage.getItem("lae_zipcode");
  }
  return null;
}

export default function RootLayout() {
  const [hasZip, setHasZip] = useState<boolean | null>(null);

  useEffect(() => {
    setHasZip(!!getStoredZip());
  }, []);

  if (hasZip === null) {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  if (!hasZip) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <PhoneFrame>
          <ZipOnboarding
            onComplete={() => {
              setHasZip(true);
            }}
          />
        </PhoneFrame>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <ConversationsProvider>
          <UIProvider>
            <RoutineProvider>
              <PhoneFrame>
                <RootNavigator />
              </PhoneFrame>
            </RoutineProvider>
          </UIProvider>
        </ConversationsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: "#0F1923",
    alignItems: "center",
    justifyContent: "center",
  },
});
