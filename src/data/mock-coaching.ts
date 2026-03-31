/**
 * Mock coaching data — 12-week curriculum, pods, and 90-day progress
 * Based on the coaching curriculum from the GTM doc (Section 12)
 */

import type { CoachingSession } from "../types/database";

// ============================================
// 12-WEEK COACHING CURRICULUM
// ============================================
export const COACHING_CURRICULUM: Array<{
  week: number;
  theme: string;
  title: string;
  description: string;
  prepInstructions: string;
  communityAssignment: string;
}> = [
  {
    week: 1,
    theme: "System Setup",
    title: "Getting Started with LAE",
    description: "How the daily digest works. Setting up your profile, market, and tracker. 90-day goal setting.",
    prepInstructions: "Complete your profile with market and content style preferences.",
    communityAssignment: "Post your first 3 adapted Reels/Shorts. Introduce yourself in community.",
  },
  {
    week: 2,
    theme: "The Daily Routine",
    title: "Building the 10-Minute Morning Habit",
    description: "When to post, how to pick adaptations, what makes a hook work. Building consistency.",
    prepInstructions: "Track your posting times this week. Note which time gets best engagement.",
    communityAssignment: "Post daily for 7 days. Log all conversations in tracker.",
  },
  {
    week: 3,
    theme: "Local Content Intelligence",
    title: "Reading the Digest Strategically",
    description: "Which Reels/Shorts to prioritize and why. Understanding engagement signals vs vanity metrics.",
    prepInstructions: "Review your top 3 performing posts. Note what they have in common.",
    communityAssignment: "Analyze your top-performing post this week. Share insights with accountability pod.",
  },
  {
    week: 4,
    theme: "Conversation Starters",
    title: "Turning Comments and DMs into Real Conversations",
    description: "What to say after 'thanks for reaching out.' Scripts and frameworks for moving from engagement to conversation.",
    prepInstructions: "Screenshot your last 5 DM conversations. Identify where they stalled.",
    communityAssignment: "Practice conversation scripts on 3 real DMs/comments this week.",
  },
  {
    week: 5,
    theme: "The Conversion Bridge",
    title: "From Conversation to Appointment",
    description: "The 3-message framework. Qualifying leads without being pushy. When to ask for the meeting.",
    prepInstructions: "List your current open conversations and their status.",
    communityAssignment: "Book at least 1 appointment from a content-driven conversation.",
  },
  {
    week: 6,
    theme: "DM Mastery",
    title: "Turning DMs Into Appointments",
    description: "Advanced DM strategies. Reading buying signals. The 'value-first' approach that converts.",
    prepInstructions: "Bring your top 3 DM conversations from this week.",
    communityAssignment: "Apply the value-first framework to every new DM this week. Track results.",
  },
  {
    week: 7,
    theme: "Content Optimization",
    title: "What Your Data Is Telling You",
    description: "Reading your tracker analytics. Which content types drive conversations vs just views. Doubling down on winners.",
    prepInstructions: "Export your tracker data. Identify your best-performing content type.",
    communityAssignment: "Create 3 pieces of content based on your top-performing format.",
  },
  {
    week: 8,
    theme: "Objection Handling",
    title: "When They Say 'Not Right Now'",
    description: "Common objections and how to handle them. The follow-up cadence that works. Staying top-of-mind without being pushy.",
    prepInstructions: "Write down the 3 most common objections you hear.",
    communityAssignment: "Follow up with every 'stale' conversation in your tracker this week.",
  },
  {
    week: 9,
    theme: "Scaling What Works",
    title: "From 1 Post/Day to a Content System",
    description: "Batch content creation. Repurposing across platforms. Building a content calendar that runs itself.",
    prepInstructions: "Plan a batch recording session. Prepare 5 scripts from your adaptations.",
    communityAssignment: "Record 5 videos in one session. Schedule them across the week.",
  },
  {
    week: 10,
    theme: "Advanced Analytics",
    title: "The Numbers That Actually Matter",
    description: "Moving beyond views and likes. Content-to-conversation rate. Conversation-to-appointment rate. Your true ROI.",
    prepInstructions: "Calculate your content-to-appointment conversion rate.",
    communityAssignment: "Set your target metrics for the final 3 weeks. Share with pod.",
  },
  {
    week: 11,
    theme: "The Closing Sprint",
    title: "Converting Your Pipeline",
    description: "Reviewing all open conversations. Priority follow-ups. The 'last 3 weeks' urgency framework.",
    prepInstructions: "Review every conversation in your tracker. Prioritize the top 5.",
    communityAssignment: "Make contact with every warm lead in your pipeline this week.",
  },
  {
    week: 12,
    theme: "Graduation & Scaling",
    title: "Your 90-Day Results and Next Steps",
    description: "Review results. Celebrate wins. Plan for Month 4+. Building a sustainable content system without coaching.",
    prepInstructions: "Prepare your 90-day results summary. Screenshots of best moments.",
    communityAssignment: "Share your 90-day transformation in the community. Help a new member.",
  },
];

// ============================================
// MOCK COACHING SESSIONS (for current cohort)
// ============================================
function getSessionDate(weekNumber: number): string {
  // Sessions are Thursdays at 12:00 PM EST, starting from cohort start
  const cohortStart = new Date();
  cohortStart.setDate(cohortStart.getDate() - (6 * 7)); // We're in week 6
  const sessionDate = new Date(cohortStart);
  sessionDate.setDate(sessionDate.getDate() + ((weekNumber - 1) * 7));
  // Find next Thursday
  const day = sessionDate.getDay();
  const daysUntilThursday = (4 - day + 7) % 7;
  sessionDate.setDate(sessionDate.getDate() + daysUntilThursday);
  sessionDate.setHours(12, 0, 0, 0);
  return sessionDate.toISOString();
}

export const MOCK_SESSIONS: CoachingSession[] = COACHING_CURRICULUM.map((week) => ({
  id: `session-${week.week}`,
  cohort_id: "cohort-2026-q1",
  week_number: week.week,
  theme: week.theme,
  title: week.title,
  description: week.description,
  session_date: getSessionDate(week.week),
  meeting_url: "https://zoom.us/j/example",
  recording_url: week.week <= 5 ? "https://recordings.example.com" : null,
  prep_instructions: week.prepInstructions,
  created_at: new Date().toISOString(),
}));

// ============================================
// MOCK ACCOUNTABILITY POD
// ============================================
export const MOCK_POD = {
  id: "pod-1",
  name: "Southeast Sellers",
  members: [
    {
      id: "pod-member-1",
      name: "Jessica T.",
      market: "Austin, TX",
      avatarColor: "#F97316",
      initials: "JT",
      currentStreak: 15,
      lastPosted: "today",
      totalPosts: 42,
      totalConversations: 18,
    },
    {
      id: "pod-member-2",
      name: "Kevin R.",
      market: "Charlotte, NC",
      avatarColor: "#60A5FA",
      initials: "KR",
      currentStreak: 9,
      lastPosted: "today",
      totalPosts: 28,
      totalConversations: 11,
    },
    {
      id: "pod-member-3",
      name: "Ashley M.",
      market: "Tampa, FL",
      avatarColor: "#4ADE80",
      initials: "AM",
      currentStreak: 4,
      lastPosted: "yesterday",
      totalPosts: 19,
      totalConversations: 7,
    },
  ],
};

// ============================================
// MOCK 90-DAY PROGRESS
// ============================================
export const MOCK_90DAY_PROGRESS = {
  currentDay: 42,
  totalDays: 90,
  targetAppointments: 10,
  stats: {
    totalPosts: 38,
    totalConversations: 47,
    totalAppointments: 3,
    totalClosings: 1,
  },
  // "On track" if pace suggests hitting 10 appointments by day 90
  paceStatus: "on_track" as "on_track" | "behind" | "ahead",
  paceMessage: "On track — agents at your pace average 8-12 by Day 90",
  milestones: [
    { day: 7, label: "First Week", reached: true },
    { day: 14, label: "Trial Convert", reached: true },
    { day: 30, label: "Month 1", reached: true },
    { day: 42, label: "You are here", reached: true },
    { day: 60, label: "Month 2", reached: false },
    { day: 90, label: "Graduation", reached: false },
  ],
};
