// Regenerate scripts for the best posts across all 6 cities
// Downloads video, transcribes with Whisper, generates with Claude

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, ".env") });

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const TEMP_DIR = path.resolve(__dirname, "output/temp");
const TRANSCRIPT_DIR = path.resolve(__dirname, "output/transcripts");
const SCRIPT_DIR = path.resolve(__dirname, "output/script_cache");

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
if (!fs.existsSync(TRANSCRIPT_DIR)) fs.mkdirSync(TRANSCRIPT_DIR, { recursive: true });
if (!fs.existsSync(SCRIPT_DIR)) fs.mkdirSync(SCRIPT_DIR, { recursive: true });

async function getVideoUrl(shortcode) {
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
  const json = await res.json();
  return json?.data?.xdt_shortcode_media?.video_url || null;
}

async function downloadVideo(shortcode) {
  const filePath = path.join(TEMP_DIR, `${shortcode}.mp4`);
  if (fs.existsSync(filePath)) return filePath;

  const videoUrl = await getVideoUrl(shortcode);
  if (!videoUrl) return null;

  const res = await fetch(videoUrl);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filePath, buf);
  console.log(`  [dl] ${shortcode}.mp4 (${(buf.length/1024/1024).toFixed(1)}MB)`);
  return filePath;
}

function transcribe(shortcode) {
  const cachePath = path.join(TRANSCRIPT_DIR, `${shortcode}.txt`);
  if (fs.existsSync(cachePath)) return fs.readFileSync(cachePath, "utf-8");

  const videoPath = path.join(TEMP_DIR, `${shortcode}.mp4`);
  if (!fs.existsSync(videoPath)) return "";

  const pyScript = path.join(TEMP_DIR, "_w.py");
  fs.writeFileSync(pyScript, `import whisper\nmodel = whisper.load_model("base")\nresult = model.transcribe("${videoPath.replace(/\\/g, "/")}", language="en")\nprint(result["text"])\n`);

  try {
    const result = execSync(`python "${pyScript}"`, {
      stdio: "pipe",
      timeout: 120000,
      env: { ...process.env, PATH: (process.env.PATH || "") + ";C:\\Users\\gaba\\AppData\\Local\\Microsoft\\WinGet\\Links" },
    });
    const text = result.toString().trim();
    if (text) {
      fs.writeFileSync(cachePath, text);
      console.log(`  [whisper] ${shortcode}: ${text.split(" ").length} words`);
    }
    try { fs.unlinkSync(pyScript); } catch {}
    return text;
  } catch (e) {
    console.log(`  [whisper] ${shortcode}: failed`);
    return "";
  }
}

async function generateScript(shortcode, title, caption, city) {
  const cachePath = path.join(SCRIPT_DIR, `${shortcode}.txt`);
  if (fs.existsSync(cachePath)) return fs.readFileSync(cachePath, "utf-8");

  if (!ANTHROPIC_KEY) return "[No API key]";

  const systemPrompt = `You are an elite real estate content strategist. Write scripts that convert viewers into leads. NEVER use em dashes or semicolons. Write like a human texting a friend. Scripts must be 80-150 words, end with a specific question as CTA.`;

  const userPrompt = `Viral Instagram Reel in ${city}, FL:\nTitle: "${title}"\nTranscript/Caption: "${caption}"\n\nRewrite as a conversion-optimized script for a ${city} real estate agent. Keep the core topic. Add psychological triggers. End with a question CTA. Return ONLY the script text.`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 500,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      if (!res.ok) {
        if (attempt < 2) { await new Promise(r => setTimeout(r, 5000)); continue; }
        return "[Script generation failed]";
      }
      const data = await res.json();
      const script = data.content[0]?.text || "";
      fs.writeFileSync(cachePath, script);
      console.log(`  [claude] ${shortcode}: ${script.split(" ").length} words`);
      return script;
    } catch (e) {
      if (attempt < 2) await new Promise(r => setTimeout(r, 5000));
    }
  }
  return "[Script generation failed]";
}

async function main() {
  const data = JSON.parse(fs.readFileSync("output/digest_all_cities.json"));
  const cityMap = {
    "Cape Coral_FL": "Cape Coral",
    "Fort Myers_FL": "Fort Myers",
    "Naples_FL": "Naples",
    "Bonita Springs_FL": "Bonita Springs",
    "Lehigh Acres_FL": "Lehigh Acres",
    "Punta Gorda_FL": "Punta Gorda",
  };

  let total = 0;
  for (const [cityKey, items] of Object.entries(data)) {
    const city = cityMap[cityKey] || cityKey;
    console.log(`\n=== ${city} (${items.length} posts) ===`);

    for (const item of items) {
      total++;
      console.log(`\n[${total}/30] ${item.shortcode} (score:${item.viralityScore}, ${item.views.toLocaleString()} views)`);

      // Download
      const videoPath = await downloadVideo(item.shortcode);
      await new Promise(r => setTimeout(r, 500));

      // Transcribe
      let transcript = "";
      if (videoPath) transcript = transcribe(item.shortcode);

      // Generate script
      const caption = transcript || item.caption || item.title;
      const script = await generateScript(item.shortcode, item.title, caption, city);

      // Update the item with the script
      item.script = script;
    }
  }

  // Save updated data
  fs.writeFileSync("output/digest_all_cities.json", JSON.stringify(data, null, 2));
  console.log(`\n\nDone! ${total} posts processed.`);
}

main().catch(console.error);
