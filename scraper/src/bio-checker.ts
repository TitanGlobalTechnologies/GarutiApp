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

  // Method 1: Fetch profile page as Googlebot — gets og:description with bio info
  // This is NOT rate limited like the API endpoint
  try {
    const res = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        "User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)",
        "Accept": "text/html",
      },
    });

    if (res.ok) {
      const html = await res.text();
      const ogDesc = html.match(/og:description.*?content="([^"]*)"/i);
      if (ogDesc?.[1]) {
        // Parse: "41K Followers, 2,599 Following, 783 Posts - See Instagram photos and videos from Melissa Orta | Southwest, FL Real Estate Broker Associate (@meli..."
        const desc = ogDesc[1].replace(/&#064;/g, "@");
        const nameMatch = desc.match(/from\s+(.+?)(?:\s*\(@|\s*$)/);
        const fullName = nameMatch?.[1]?.trim() || "";

        // The og:description contains the display name which often has their title
        // We use the full description as the "bio" since it captures the name + role
        const profile: ProfileData = {
          username,
          fullName,
          bio: fullName, // The display name IS the bio signal (e.g., "Melissa Orta | Southwest, FL Real Estate Broker Associate")
          category: "",
          isBusiness: false,
          followers: 0,
        };

        // Try to extract follower count
        const followersMatch = desc.match(/([\d,.]+[KkMm]?)\s*Followers/i);
        if (followersMatch) {
          const raw = followersMatch[1].replace(/,/g, "");
          if (raw.endsWith("K") || raw.endsWith("k")) profile.followers = parseFloat(raw) * 1000;
          else if (raw.endsWith("M") || raw.endsWith("m")) profile.followers = parseFloat(raw) * 1000000;
          else profile.followers = parseInt(raw) || 0;
        }

        fs.writeFileSync(cachePath, JSON.stringify(profile, null, 2));
        return profile;
      }
    }
  } catch {}

  // Method 2: Try the API endpoint (may be rate limited)
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

    if (res.ok) {
      const json = (await res.json()) as any;
      const user = json?.data?.user;
      if (user) {
        const profile: ProfileData = {
          username: user.username || username,
          fullName: user.full_name || "",
          bio: user.biography || "",
          category: user.category_name || "",
          isBusiness: user.is_business_account || false,
          followers: user.edge_followed_by?.count || 0,
        };
        fs.writeFileSync(cachePath, JSON.stringify(profile, null, 2));
        return profile;
      }
    }
  } catch {}

  console.log(`  [bio] @${username}: could not fetch profile`);
  return null;
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
