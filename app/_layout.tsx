import "../global.css";
import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuthContext } from "../src/providers/AuthProvider";
import PhoneFrame from "../components/PhoneFrame";

function RootNavigator() {
  const { session, loading } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    setIsReady(true);
  }, [loading]);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === "auth";

    if (!session && !inAuthGroup) {
      router.replace("/auth/welcome");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, segments, isReady]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <PhoneFrame>
          <RootNavigator />
        </PhoneFrame>
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
