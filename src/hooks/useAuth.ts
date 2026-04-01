import { useState, useEffect } from "react";
import { Platform } from "react-native";
import { supabase, isDemoMode } from "../lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import type { Profile } from "../types/database";
import { matchZipToCity } from "../data/swfl-zipcodes";

// Read zip from localStorage (set by onboarding screen)
function getStoredZip(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.localStorage?.getItem("lae_zipcode") || "33914";
  }
  return "33914";
}

function getStoredCity(): string {
  const zip = getStoredZip();
  return matchZipToCity(zip) || "Cape Coral";
}

function buildDemoProfile(): Profile {
  return {
  id: "demo-user",
  full_name: "Demo Agent",
  email: "demo@localauthorityengine.com",
  avatar_url: null,
  market_city: getStoredCity(),
  market_state: "FL",
  market_zip: getStoredZip(),
  experience_years: 8,
  content_style: "Professional but approachable",
  stripe_customer_id: null,
  subscription_tier: "trial",
  subscription_status: "trialing",
  trial_ends_at: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
  onboarding_completed: true,
  notification_preferences: { digest: true, streak: true, coaching: true },
  created_at: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
  };
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Demo mode: skip Supabase, use mock user
    // buildDemoProfile() reads from localStorage at call time, not module load
    if (isDemoMode) {
      setSession({ user: { id: "demo-user" } } as Session);
      setUser({ id: "demo-user" } as User);
      setProfile(buildDemoProfile());
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    if (isDemoMode) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setProfile(data as Profile);
    }
    setLoading(false);
  }

  async function signUp(
    email: string,
    password: string,
    fullName: string,
    marketCity: string,
    marketState: string
  ) {
    if (isDemoMode) return { data: null, error: new Error("Demo mode — connect Supabase to enable auth") };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          market_city: marketCity,
          market_state: marketState,
        },
      },
    });
    return { data, error };
  }

  async function signIn(email: string, password: string) {
    if (isDemoMode) return { data: null, error: new Error("Demo mode — connect Supabase to enable auth") };
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }

  async function signOut() {
    if (isDemoMode) return { error: null };
    const { error } = await supabase.auth.signOut();
    return { error };
  }

  async function resetPassword(email: string) {
    if (isDemoMode) return { data: null, error: new Error("Demo mode — connect Supabase to enable auth") };
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    return { data, error };
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (isDemoMode) {
      setProfile((prev) => prev ? { ...prev, ...updates } : prev);
      return { data: null, error: null };
    }
    if (!user) return { error: new Error("Not authenticated") };
    const { data, error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select()
      .single();

    if (!error && data) {
      setProfile(data as Profile);
    }
    return { data, error };
  }

  return {
    session,
    user,
    profile,
    loading,
    isDemoMode,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile: () => user && fetchProfile(user.id),
  };
}
