/**
 * Bio Checker — fetches an Instagram user's bio and checks for RE keywords.
 * Only called for posts we intend to publish (top candidates), not all posts.
 * Uses the web_profile_info endpoint — 1 call per user, cached forever.
 */

import * as fs from "fs";
import * as path from "path";
import { detectAgent, AgentDetectionResult } from "./agent-detector";

const BIO_CACHE_DIR = path.resolve(__dirname, "../output/bio_cache");

if (!fs.existsSync(BIO_CACHE_DIR)) fs.mkdirSync(BIO_CACHE_DIR, { recursive: true });

interface ProfileData {
  username: string;
  fullName: string;
  bio: string;
  category: string;
  isBusiness: boolean;
  followers: number;
}

/**
 * Fetch a user's profile (bio, category, etc.) from Instagram
 * Cached per username — never fetches the same profile twice
 */
export async function fetchProfile(username: string): Promise<ProfileData | null> {
  // Check cache first
  const cachePath = path.join(BIO_CACHE_DIR, `${username}.json`);
  if (fs.existsSync(cachePath)) {
    return JSON.parse(fs.readFileSync(cachePath, "utf-8"));
  }

  try {
    const res = await fetch(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
      {
        headers: {
          "User-Agent": "Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; 458229258)",
          "X-IG-App-ID": "936619743392459",
        },
      }
    );

    if (!res.ok) {
      console.log(`  [bio] @${username}: HTTP ${res.status}`);
      return null;
    }

    const json = (await res.json()) as any;
    const user = json?.data?.user;
    if (!user) return null;

    const profile: ProfileData = {
      username: user.username || username,
      fullName: user.full_name || "",
      bio: user.biography || "",
      category: user.category_name || "",
      isBusiness: user.is_business_account || false,
      followers: user.edge_followed_by?.count || 0,
    };

    // Cache it forever
    fs.writeFileSync(cachePath, JSON.stringify(profile, null, 2));
    return profile;
  } catch (err: any) {
    console.log(`  [bio] @${username}: error ${err.message}`);
    return null;
  }
}

/**
 * Check if a post's author is a real estate agent by fetching their bio.
 * Uses cached bios when available (zero API calls for repeat checks).
 *
 * Also uses full_name and username from the post data as fallback
 * if the profile endpoint fails (rate limited, etc.)
 */
export async function isRealEstateAgent(params: {
  username: string;
  fullName?: string;
  caption?: string;
}): Promise<AgentDetectionResult> {
  // First try fetching the full bio
  const profile = await fetchProfile(params.username);

  if (profile) {
    console.log(`  [bio] @${params.username}: "${profile.bio.replace(/\n/g, " | ").slice(0, 80)}"`);

    return detectAgent({
      fullName: profile.fullName,
      username: params.username,
      bio: profile.bio,
      caption: params.caption,
      followers: profile.followers,
    });
  }

  // Fallback: use post-level data only (no bio)
  console.log(`  [bio] @${params.username}: could not fetch bio, using post data only`);
  return detectAgent({
    fullName: params.fullName,
    username: params.username,
    caption: params.caption,
  });
}
