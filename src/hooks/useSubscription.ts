import { useState, useEffect, useMemo, useCallback } from "react";
import type { SubscriptionTier, SubscriptionStatus } from "../types/database";

// TODO: Replace with Stripe + Supabase when API keys are configured

export interface PlanDetails {
  tier: SubscriptionTier;
  name: string;
  price: number;
  priceLabel: string;
  description: string;
  features: string[];
  highlighted: boolean;
  badge?: string;
}

export const PLANS: PlanDetails[] = [
  {
    tier: "saas",
    name: "SaaS Only",
    price: 99,
    priceLabel: "$99/mo",
    description: "Daily digest + AI adaptations + conversation tracker",
    features: [
      "Daily digest of top local content",
      "5 AI-adapted scripts per post",
      "Conversation tracker",
      "Posting streak & badges",
      "Weekly progress reports",
    ],
    highlighted: false,
  },
  {
    tier: "bundle",
    name: "Bundle",
    price: 449,
    priceLabel: "$449/mo",
    description: "Everything in SaaS + live coaching + 90-day guarantee",
    features: [
      "Everything in SaaS",
      "Weekly live coaching sessions",
      "90-day appointment guarantee (10 appts)",
      "Accountability pod (3-4 agents)",
      "1:1 check-in at 60-day mark",
      "12-week structured curriculum",
      "Morning routine (V2)",
      "AI weekly focus (V2)",
    ],
    highlighted: true,
    badge: "Most Popular",
  },
  {
    tier: "coaching",
    name: "Coaching Only",
    price: 397,
    priceLabel: "$397/mo",
    description: "Live coaching + accountability without the SaaS tool",
    features: [
      "Weekly live coaching sessions",
      "90-day appointment guarantee",
      "Accountability pod",
      "Coaching curriculum & recordings",
    ],
    highlighted: false,
  },
];

export function useSubscription() {
  const [tier, setTier] = useState<SubscriptionTier>("trial");
  const [status, setStatus] = useState<SubscriptionStatus>("trialing");
  const [trialEndsAt, setTrialEndsAt] = useState<Date>(
    new Date(Date.now() + 8 * 24 * 60 * 60 * 1000) // 8 days from now for demo
  );
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 200));
      // Mock: user is on trial with 8 days left
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Trial countdown
  const trialDaysRemaining = useMemo(() => {
    const diff = trialEndsAt.getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [trialEndsAt]);

  const isTrialActive = status === "trialing" && trialDaysRemaining > 0;
  const isTrialExpired = status === "trialing" && trialDaysRemaining <= 0;
  const isActive = status === "active";
  const isPastDue = status === "past_due";

  // Feature gating
  const hasFeature = useCallback(
    (feature: "digest" | "adaptations" | "tracker" | "coaching" | "pods" | "routine" | "focus") => {
      // Trial and active users get everything during trial
      if (isTrialActive) return true;

      switch (feature) {
        case "digest":
        case "adaptations":
        case "tracker":
          return tier === "saas" || tier === "bundle";
        case "coaching":
        case "pods":
          return tier === "coaching" || tier === "bundle";
        case "routine":
        case "focus":
          return tier === "bundle";
        default:
          return false;
      }
    },
    [tier, isTrialActive]
  );

  // Mock subscription actions
  async function subscribe(selectedTier: SubscriptionTier) {
    // TODO: Create Stripe Checkout Session and redirect
    // For now, mock the state change
    setTier(selectedTier);
    setStatus("active");
    return { success: true, checkoutUrl: null as string | null };
  }

  async function cancelSubscription() {
    // TODO: Call Stripe API to cancel
    setStatus("canceled");
    return { success: true };
  }

  async function pauseSubscription() {
    // TODO: Call Stripe API to pause
    setStatus("paused");
    return { success: true };
  }

  const currentPlan = PLANS.find((p) => p.tier === tier) || null;

  return {
    tier,
    status,
    trialEndsAt,
    trialDaysRemaining,
    isTrialActive,
    isTrialExpired,
    isActive,
    isPastDue,
    hasFeature,
    currentPlan,
    plans: PLANS,
    subscribe,
    cancelSubscription,
    pauseSubscription,
    loading,
    refresh: fetchSubscription,
  };
}
