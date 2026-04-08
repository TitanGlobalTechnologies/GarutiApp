/**
 * transcribe-top-posts.js — Transcribe ONLY the top 5 posts per city
 *
 * Instagram: yt-dlp to download video, Whisper to transcribe
 * YouTube: youtube-transcript-api (Python, free)
 *
 * Usage: node transcribe-top-posts.js
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, ".env") });

const MASTER_FILE = path.resolve(__dirname, "output/digest_master_raw.json");
const TRANSCRIPT_DIR = path.resolve(__dirname, "output/transcripts");
const TEMP_DIR = path.resolve(__dirname, "output/temp");

for (const dir of [TEMP_DIR, TRANSCRIPT_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

let { getYouTubeTranscriptAsync } = { getYouTubeTranscriptAsync: null };
try {
  ({ getYouTubeTranscriptAsync } = require("./src/youtube-transcript"));
} catch (e) { console.log("youtube-transcript not available: " + e.message); }

// Load the list of posts to transcribe
const toTranscribe = JSON.parse(fs.readFileSync("output/top_posts_to_transcribe.json", "utf-8"));
console.log(`\nTranscribing ${toTranscribe.length} top posts (${toTranscribe.filter(p => p.platform === "instagram").length} IG, ${toTranscribe.filter(p => p.platform === "youtube").length} YT)\n`);

async function transcribeIG(shortcode) {
  const cachePath = path.join(TRANSCRIPT_DIR, `${shortcode}.txt`);
  if (fs.existsSync(cachePath)) return fs.readFileSync(cachePath, "utf-8");

  const videoPath = path.join(TEMP_DIR, `${shortcode}.mp4`);
  try {
    if (!fs.existsSync(videoPath)) {
      const reelUrl = `https://www.instagram.com/reel/${shortcode}/`;
      console.log(`    Downloading via yt-dlp...`);
      execSync(`yt-dlp -q --no-warnings --merge-output-format mp4 -o "${videoPath.replace(/\\/g, "/")}" "${reelUrl}"`, {
        stdio: "pipe", timeout: 90000,
        env: { ...process.env, PATH: (process.env.PATH || "") + ";C:\\Python313\\Scripts" },
      });
    }
    if (!fs.existsSync(videoPath)) { console.log(`    Download failed`); return ""; }

    console.log(`    Running Whisper...`);
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
  } catch (e) { console.log(`    Error: ${e.message?.slice(0, 80)}`); return ""; }
}

async function transcribeYT(videoId) {
  const cachePath = path.join(TRANSCRIPT_DIR, `yt_${videoId}.txt`);
  if (fs.existsSync(cachePath)) return fs.readFileSync(cachePath, "utf-8");
  if (!getYouTubeTranscriptAsync) return "";

  try {
    console.log(`    Fetching YT transcript...`);
    const { transcript } = await getYouTubeTranscriptAsync(videoId);
    if (transcript) fs.writeFileSync(cachePath, transcript);
    return transcript || "";
  } catch (e) { console.log(`    Error: ${e.message?.slice(0, 80)}`); return ""; }
}

async function main() {
  const master = JSON.parse(fs.readFileSync(MASTER_FILE, "utf-8"));
  let success = 0, failed = 0, cached = 0;

  for (let i = 0; i < toTranscribe.length; i++) {
    const { sc, platform, city, author } = toTranscribe[i];
    console.log(`  [${i + 1}/${toTranscribe.length}] ${platform.padEnd(9)} | ${city.padEnd(14)} | @${author}`);

    let transcript = "";
    const cachePath = path.join(TRANSCRIPT_DIR, `${sc}.txt`);
    if (fs.existsSync(cachePath)) {
      transcript = fs.readFileSync(cachePath, "utf-8");
      console.log(`    CACHED (${transcript.trim().split(/\\s+/).length} words)`);
      cached++;
    } else if (platform === "youtube") {
      const videoId = sc.replace("yt_", "");
      transcript = await transcribeYT(videoId);
    } else {
      transcript = await transcribeIG(sc);
    }

    if (transcript && transcript.trim().length > 0) {
      const words = transcript.trim().split(/\s+/).length;
      if (!fs.existsSync(cachePath)) {
        console.log(`    OK (${words} words)`);
        success++;
      }
      // Propagate to master
      for (const [scope, posts] of Object.entries(master)) {
        for (const p of posts) {
          if (p.shortcode === sc) {
            p.transcript = transcript;
            p.hasSpeech = words >= 15;
          }
        }
      }
    } else {
      if (!fs.existsSync(cachePath)) {
        console.log(`    FAILED`);
        failed++;
      }
    }
  }

  fs.writeFileSync(MASTER_FILE, JSON.stringify(master, null, 2));
  // Also update digest_all_with_scope.json
  fs.writeFileSync("output/digest_all_with_scope.json", JSON.stringify(master, null, 2));

  console.log(`\nDone: ${success} new, ${cached} cached, ${failed} failed`);
  console.log("Master + digest_all_with_scope.json updated.");
}

main().catch(console.error);
