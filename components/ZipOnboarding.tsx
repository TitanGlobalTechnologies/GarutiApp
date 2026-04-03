import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from "react-native";
import { SUPPORTED_CITIES } from "../src/data/swfl-zipcodes";

// Representative zip per city (for localStorage backwards compat)
const CITY_ZIPS: Record<string, string> = {
  "Cape Coral": "33914",
  "Fort Myers": "33901",
  "Naples": "34102",
  "Bonita Springs": "34134",
  "Lehigh Acres": "33971",
  "Punta Gorda": "33950",
};

interface ZipOnboardingProps {
  onComplete: (zip: string, city: string) => void;
}

export default function ZipOnboarding({ onComplete }: ZipOnboardingProps) {
  const [selectedCity, setSelectedCity] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  function handleSelect(city: string) {
    setSelectedCity(city);
    setDropdownOpen(false);
  }

  function handleSubmit() {
    if (!selectedCity) return;
    const zip = CITY_ZIPS[selectedCity] || "33914";

    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.localStorage.setItem("lae_zipcode", zip);
      window.localStorage.setItem("lae_city", selectedCity);
    }

    onComplete(zip, selectedCity);
  }

  const isReady = selectedCity !== "";

  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>LAE</Text>
      </View>
      <Text style={styles.title}>Local Authority Engine</Text>
      <Text style={styles.subtitle}>
        Find the most viral real estate content{"\n"}in your area. Select your city to start.
      </Text>

      <View style={styles.form}>
        <View style={styles.dropdownWrapper}>
          <TouchableOpacity
            style={[styles.dropdownTrigger, isReady && styles.dropdownTriggerSelected]}
            onPress={() => setDropdownOpen(!dropdownOpen)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dropdownText, !selectedCity && styles.dropdownPlaceholder]}>
              {selectedCity || "Choose your city"}
            </Text>
            <Text style={styles.dropdownArrow}>{dropdownOpen ? "\u25B2" : "\u25BC"}</Text>
          </TouchableOpacity>

          {dropdownOpen && (
            <View style={styles.dropdownList}>
              <ScrollView nestedScrollEnabled style={styles.dropdownScroll}>
                {SUPPORTED_CITIES.map((city) => (
                  <TouchableOpacity
                    key={city}
                    style={[styles.dropdownItem, selectedCity === city && styles.dropdownItemActive]}
                    onPress={() => handleSelect(city)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dropdownItemText, selectedCity === city && styles.dropdownItemTextActive]}>
                      {city}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {isReady && (
          <Text style={styles.cityMatch}>{selectedCity}, FL</Text>
        )}

        <TouchableOpacity
          style={[styles.button, isReady && styles.buttonActive]}
          onPress={handleSubmit}
          disabled={!isReady}
          activeOpacity={0.7}
        >
          <Text style={[styles.buttonText, isReady && styles.buttonTextActive]}>
            {isReady ? `Start exploring ${selectedCity}` : "Select a city above"}
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
  dropdownWrapper: {
    position: "relative",
    zIndex: 10,
  },
  dropdownTrigger: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.05)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownTriggerSelected: {
    borderColor: "#4ADE80",
  },
  dropdownText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  dropdownPlaceholder: {
    color: "#6B7280",
    fontWeight: "500",
  },
  dropdownArrow: {
    color: "#6B7280",
    fontSize: 12,
  },
  dropdownList: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#1A1A24",
    overflow: "hidden",
    zIndex: 20,
  },
  dropdownScroll: {
    maxHeight: 240,
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  dropdownItemActive: {
    backgroundColor: "rgba(249,115,22,0.15)",
  },
  dropdownItemText: {
    color: "#D1D5DB",
    fontSize: 16,
    fontWeight: "600",
  },
  dropdownItemTextActive: {
    color: "#F97316",
  },
  cityMatch: {
    color: "#4ADE80",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 10,
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
