import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { matchZipToCity } from "../src/data/swfl-zipcodes";

interface ZipOnboardingProps {
  onComplete: (zip: string, city: string) => void;
}

export default function ZipOnboarding({ onComplete }: ZipOnboardingProps) {
  const [zip, setZip] = useState("");
  const [matchedCity, setMatchedCity] = useState("");
  const [error, setError] = useState("");

  function handleInput(val: string) {
    const clean = val.replace(/[^0-9]/g, "").slice(0, 5);
    setZip(clean);
    setError("");
    setMatchedCity("");

    if (clean.length === 5) {
      const city = matchZipToCity(clean);
      if (city) {
        setMatchedCity(city);
      } else {
        setError("We don't cover this area yet. Try a SW Florida zip code.\nCape Coral: 33914 | Fort Myers: 33901 | Naples: 34102");
      }
    }
  }

  function handleSubmit() {
    if (zip.length !== 5) {
      setError("Please enter a 5-digit zip code");
      return;
    }
    const city = matchZipToCity(zip);
    if (!city) {
      setError("We don't cover this area yet. Try a SW Florida zip code.");
      return;
    }

    // Save to localStorage for persistence
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.localStorage.setItem("lae_zipcode", zip);
      window.localStorage.setItem("lae_city", city);
    }

    onComplete(zip, city);
  }

  const isReady = zip.length === 5 && matchedCity !== "";

  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>LAE</Text>
      </View>
      <Text style={styles.title}>Local Authority Engine</Text>
      <Text style={styles.subtitle}>
        Find the most viral real estate content{"\n"}in your area. Enter your zip code to start.
      </Text>

      <View style={styles.form}>
        <TextInput
          style={[
            styles.input,
            isReady && styles.inputSuccess,
            error ? styles.inputError : null,
          ]}
          value={zip}
          onChangeText={handleInput}
          placeholder="Zip code"
          placeholderTextColor="#6B7280"
          keyboardType="number-pad"
          maxLength={5}
          autoFocus
        />

        {matchedCity ? (
          <Text style={styles.cityMatch}>📍 {matchedCity}, FL</Text>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, isReady && styles.buttonActive]}
          onPress={handleSubmit}
          disabled={!isReady}
          activeOpacity={0.7}
        >
          <Text style={[styles.buttonText, isReady && styles.buttonTextActive]}>
            {isReady ? `Start exploring ${matchedCity}` : "Enter zip code above"}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Currently serving SW Florida</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0F",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  logoText: { fontSize: 30, fontWeight: "800", color: "#fff" },
  title: { fontSize: 24, fontWeight: "700", color: "#fff", marginBottom: 6 },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  form: { width: "100%", maxWidth: 280 },
  input: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "#fff",
    fontSize: 22,
    textAlign: "center",
    fontWeight: "700",
    letterSpacing: 6,
  },
  inputSuccess: { borderColor: "#4ADE80" },
  inputError: { borderColor: "#F87171" },
  cityMatch: {
    color: "#4ADE80",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 10,
  },
  error: {
    color: "#F87171",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
  button: {
    width: "100%",
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#2a3a4e",
    alignItems: "center",
    marginTop: 16,
  },
  buttonActive: { backgroundColor: "#F97316" },
  buttonText: { color: "#6B7280", fontSize: 17, fontWeight: "700" },
  buttonTextActive: { color: "#fff" },
  footer: { color: "#6B7280", fontSize: 11, marginTop: 24 },
});
