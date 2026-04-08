/**
 * backfill-transcripts.js — Load cached transcripts into master data
 *
 * For posts that have a cached transcript file on disk but no transcript
 * in the JSON data, this script loads the cached file. For IG posts without
 * cached transcripts, it runs Whisper. For YT posts, it uses youtube-transcript-api.
 *
 * Usage:
 *   node backfill-transcripts.js              # Backfill all posts missing transcripts
 *   node backfill-transcripts.js --cache-only  # Only load from cache, no new transcriptions
 *   node backfill-transcripts.js --cities-only  # Only process city-scope posts
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, ".env") });

const MASTER_FILE = path.resolve(__dirname, "output/digest_master_raw.json");
const TRANSCRIPT_DIR = path.resolve(__dirname, "output/transcripts");
const TEMP_DIR = path.resolve(__dirname, "output/temp");

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const args = process.argv.slice(2);
const cacheOnly = args.includes("--cache-only");
const citiesOnly = args.includes("--cities-only");

const CITY_SCOPES = new Set([
  "Cape Coral_FL", "Fort Myers_FL", "Naples_FL",
  "Bonita Springs_FL", "Lehigh Acres_FL", "Punta Gorda_FL", "Florida",
]);

let { getYouTubeTranscriptAsync } = { getYouTubeTranscriptAsync: null };
try {
  ({ getYouTubeTranscriptAsync } = require("./src/youtube-transcript"));
} catch {}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function transcribeIG(shortcode) {
  const cachePath = path.join(TRANSCRIPT_DIR, `${shortcode}.txt`);
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath, "utf-8");
  }
  if (cacheOnly) return "";

  // Download video with yt-dlp (no IG API needed), then transcribe with Whisper
  const videoPath = path.join(TEMP_DIR, `${shortcode}.mp4`);
  try {
    if (!fs.existsSync(videoPath)) {
      const reelUrl = `https://www.instagram.com/reel/${shortcode}/`;
      execSync(`yt-dlp -q --no-warnings --merge-output-format mp4 -o "${videoPath.replace(/\\/g, "/")}" "${reelUrl}"`, {
        stdio: "pipe", timeout: 60000,
        env: { ...process.env, PATH: (process.env.PATH || "") + ";C:\\Python313\\Scripts" },
      });
    }
    if (!fs.existsSync(videoPath)) return "";

    const pyScript = path.join(TEMP_DIR, `_w_${shortcode}.py`);
    const vp = videoPath.replace(/\\/g, "/");
    fs.writeFileSync(pyScript, `import whisper\nmodel = whisper.load_model("base")\nresult = model.transcribe("${vp}", language="en")\nprint(result["text"])\n`);
    const result = execSync(`python "${pyScript}"`, {
      stdio: "pipe", timeout: 120000,
      env: { ...process.env, PATH: (process.env.PATH || "") + ";C:\\Users\\gaba\\AppData\\Local\\Microsoft\\WinGet\\Links" },
    }).toString().trim();
    try { fs.unlinkSync(pyScript); } catch {}
    if (result) {
      fs.writeFileSync(cachePath, result);
      try { fs.unlinkSync(videoPath); } catch {}
    }
    return result;
  } catch { return ""; }
}

async function transcribeYT(videoId) {
  const cachePath = path.join(TRANSCRIPT_DIR, `yt_${videoId}.txt`);
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath, "utf-8");
  }
  if (cacheOnly || !getYouTubeTranscriptAsync) return "";

  try {
    const { transcript } = await getYouTubeTranscriptAsync(videoId);
    if (transcript) {
      fs.writeFileSync(cachePath, transcript);
    }
    return transcript || "";
  } catch { return ""; }
}

async function main() {
  console.log("Loading master file...");
  const master = JSON.parse(fs.readFileSync(MASTER_FILE, "utf-8"));

  // Collect all unique posts that need transcripts
  const needsTranscript = [];
  const seen = new Set();

  for (const [scope, posts] of Object.entries(master)) {
    if (citiesOnly && !CITY_SCOPES.has(scope)) continue;
    for (const p of posts) {
      if (seen.has(p.shortcode)) continue;
      seen.add(p.shortcode);
      if (p.transcript && p.transcript.trim().length > 0) continue; // already has transcript
      needsTranscript.push({ post: p, scope });
    }
  }

  console.log(`Posts needing transcripts: ${needsTranscript.length} (of ${seen.size} unique)`);
  if (cacheOnly) console.log("  (cache-only mode: no new transcriptions)");

  let loaded = 0, newTranscribed = 0, failed = 0;

  for (let i = 0; i < needsTranscript.length; i++) {
    const { post } = needsTranscript[i];
    const pct = Math.round(((i + 1) / needsTranscript.length) * 100);
    const isYT = post.shortcode.startsWith("yt_");
    const platform = isYT ? "YT" : "IG";

    process.stdout.write(`\r  [${pct}%] ${i + 1}/${needsTranscript.length} | loaded:${loaded} new:${newTranscribed} fail:${failed} | @${(post.author || "").slice(0, 20).padEnd(20)}   `);

    let transcript = "";
    if (isYT) {
      const videoId = post.shortcode.replace("yt_", "");
      transcript = await transcribeYT(videoId);
    } else {
      transcript = await transcribeIG(post.shortcode);
    }

    if (transcript && transcript.trim().length > 0) {
      // Check if it was from cache or new
      const cachePath = path.join(TRANSCRIPT_DIR, `${post.shortcode}.txt`);
      const wasAlreadyCached = fs.existsSync(cachePath);

      // Propagate transcript to ALL copies of this post across scopes
      for (const [scope, posts] of Object.entries(master)) {
        for (const p of posts) {
          if (p.shortcode === post.shortcode) {
            p.transcript = transcript;
            const words = transcript.trim().split(/\s+/).length;
            p.hasSpeech = words >= 15;
          }
        }
      }
      loaded++;
    } else {
      failed++;
    }

    if (!isYT && !cacheOnly) await sleep(500); // rate limit for IG API
  }

  console.log(`\n\nDone: ${loaded} loaded, ${newTranscribed} new, ${failed} failed`);

  // Save updated master
  fs.writeFileSync(MASTER_FILE, JSON.stringify(master, null, 2));
  console.log("Master file updated with transcripts.");
}

main().catch(console.error);
