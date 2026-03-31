import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const config = {
  serpApiKey: process.env.SERPAPI_KEY || "",
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  mode: (process.env.SCRAPER_MODE || "mock") as "mock" | "live",
  markets: (process.env.MARKETS || "Cape Coral:FL:33914").split(",").map((m) => {
    const [city, state, zip] = m.trim().split(":");
    return { city, state, zip };
  }),
  topN: 5,
  fixturesDir: path.resolve(__dirname, "../fixtures"),
};

export type Market = { city: string; state: string; zip: string };
