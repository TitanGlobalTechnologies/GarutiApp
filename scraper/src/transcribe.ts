/**
 * Video Download + Whisper Transcription
 *
 * 1. Fetches video URL from Instagram GraphQL (already have this)
 * 2. Downloads the video to a temp file
 * 3. Runs Whisper locally (free, no API key) to transcribe
 * 4. Returns the transcript text
 *
 * Requires: pip install openai-whisper
 * Whisper runs 100% locally — no data sent to any server.
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const TEMP_DIR = path.resolve(__dirname, "../output/temp");
const TRANSCRIPT_CACHE_DIR = path.resolve(__dirname, "../output/transcripts");

/**
 * Fetch the video URL from Instagram's GraphQL endpoint
 */
export async function getVideoUrl(shortcode: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      variables: JSON.stringify({ shortcode }),
      doc_id: "10015901848480474",
      lsd: "AVqbxe3J_YA",
    });

    const res = await fetch(`https://www.instagram.com/api/graphql?${params}`, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "X-IG-App-ID": "936619743392459",
        "X-FB-LSD": "AVqbxe3J_YA",
        "X-ASBD-ID": "129477",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!res.ok) return null;
    const json = (await res.json()) as any;
    return json?.data?.xdt_shortcode_media?.video_url || null;
  } catch {
    return null;
  }
}

/**
 * Download a video from URL to a local temp file
 */
async function downloadVideo(videoUrl: string, shortcode: string): Promise<string> {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

  const filePath = path.join(TEMP_DIR, `${shortcode}.mp4`);

  // Skip if already downloaded
  if (fs.existsSync(filePath)) {
    console.log(`  [dl] Already downloaded: ${shortcode}.mp4`);
    return filePath;
  }

  console.log(`  [dl] Downloading video for ${shortcode}...`);
  const res = await fetch(videoUrl);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
  console.log(`  [dl] Saved: ${shortcode}.mp4 (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);

  return filePath;
}

/**
 * Check if we have a cached transcript
 */
function getCachedTranscript(shortcode: string): string | null {
  const cachePath = path.join(TRANSCRIPT_CACHE_DIR, `${shortcode}.txt`);
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath, "utf-8");
  }
  return null;
}

/**
 * Save transcript to cache
 */
function cacheTranscript(shortcode: string, transcript: string) {
  if (!fs.existsSync(TRANSCRIPT_CACHE_DIR)) {
    fs.mkdirSync(TRANSCRIPT_CACHE_DIR, { recursive: true });
  }
  fs.writeFileSync(path.join(TRANSCRIPT_CACHE_DIR, `${shortcode}.txt`), transcript);
}

/**
 * Run Whisper locally to transcribe a video file
 * Uses the "base" model — fast enough for 30-60s clips
 */
function runWhisper(videoPath: string): string {
  const outputDir = path.dirname(videoPath);

  try {
    console.log(`  [whisper] Transcribing...`);
    // Write a temp Python script to run Whisper
    const pyScript = path.join(TEMP_DIR, "_whisper_run.py");
    const videoPathClean = videoPath.replace(/\\/g, "/");
    fs.writeFileSync(pyScript, `import whisper\nmodel = whisper.load_model("base")\nresult = model.transcribe("${videoPathClean}", language="en")\nprint(result["text"])\n`);

    const result = execSync(`python "${pyScript}"`, {
      stdio: "pipe",
      timeout: 120000,
      env: { ...process.env, PATH: (process.env.PATH || "") + ";C:\\Users\\gaba\\AppData\\Local\\Microsoft\\WinGet\\Links" },
    });

    // Clean up temp script
    try { fs.unlinkSync(pyScript); } catch {}

    return result.toString().trim();

    // Should not reach here — return handled above
    return "";
  } catch (err: any) {
    console.error(`  [whisper] Error: ${err.message}`);
    return "";
  }
}

/**
 * Full pipeline: get video URL → download → transcribe → return text
 * Cached per shortcode — only transcribes once per reel
 */
export async function transcribeReel(shortcode: string): Promise<string> {
  // Check cache first
  const cached = getCachedTranscript(shortcode);
  if (cached) {
    console.log(`  [transcript] Cache HIT: ${shortcode} (${cached.split(" ").length} words)`);
    return cached;
  }

  console.log(`  [transcript] Cache MISS: ${shortcode} — fetching video...`);

  // Get video URL
  const videoUrl = await getVideoUrl(shortcode);
  if (!videoUrl) {
    console.log(`  [transcript] Could not get video URL for ${shortcode}`);
    return "";
  }

  // Download
  const videoPath = await downloadVideo(videoUrl, shortcode);

  // Transcribe
  const transcript = runWhisper(videoPath);

  if (transcript) {
    cacheTranscript(shortcode, transcript);
    console.log(`  [transcript] Done: ${transcript.split(" ").length} words`);

    // Clean up video file to save disk space
    try { fs.unlinkSync(videoPath); } catch {}
  } else {
    console.log(`  [transcript] No speech detected or transcription failed`);
  }

  return transcript;
}

/**
 * Test with one reel
 */
async function test() {
  console.log("Testing transcription pipeline...\n");
  const transcript = await transcribeReel("DWSgxlijTvs");
  console.log("\nTranscript:");
  console.log(transcript || "(empty)");
}

if (require.main === module) {
  test().catch(console.error);
}
