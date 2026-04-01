/**
 * SW Florida zip code → city mapping
 * When a user enters their zip, we match them to the closest supported city
 * and show them content scraped for that market.
 */

export type SupportedCity = "Cape Coral" | "Fort Myers" | "Naples" | "Bonita Springs" | "Lehigh Acres" | "Punta Gorda";

const ZIP_MAP: Record<string, SupportedCity> = {
  // Cape Coral
  "33904": "Cape Coral",
  "33909": "Cape Coral",
  "33910": "Cape Coral",
  "33914": "Cape Coral",
  "33990": "Cape Coral",
  "33991": "Cape Coral",
  "33993": "Cape Coral",
  "33915": "Cape Coral",

  // Fort Myers
  "33901": "Fort Myers",
  "33902": "Fort Myers",
  "33903": "Fort Myers",
  "33905": "Fort Myers",
  "33906": "Fort Myers",
  "33907": "Fort Myers",
  "33908": "Fort Myers",
  "33911": "Fort Myers",
  "33912": "Fort Myers",
  "33913": "Fort Myers",
  "33916": "Fort Myers",
  "33917": "Fort Myers",
  "33919": "Fort Myers",
  "33966": "Fort Myers",

  // Naples
  "34101": "Naples",
  "34102": "Naples",
  "34103": "Naples",
  "34104": "Naples",
  "34105": "Naples",
  "34106": "Naples",
  "34108": "Naples",
  "34109": "Naples",
  "34110": "Naples",
  "34112": "Naples",
  "34113": "Naples",
  "34114": "Naples",
  "34116": "Naples",
  "34117": "Naples",
  "34119": "Naples",
  "34120": "Naples",

  // Bonita Springs
  "34133": "Bonita Springs",
  "34134": "Bonita Springs",
  "34135": "Bonita Springs",
  "34136": "Bonita Springs",

  // Lehigh Acres
  "33936": "Lehigh Acres",
  "33970": "Lehigh Acres",
  "33971": "Lehigh Acres",
  "33972": "Lehigh Acres",
  "33973": "Lehigh Acres",
  "33974": "Lehigh Acres",
  "33976": "Lehigh Acres",

  // Punta Gorda
  "33950": "Punta Gorda",
  "33951": "Punta Gorda",
  "33952": "Punta Gorda",
  "33955": "Punta Gorda",
  "33980": "Punta Gorda",
  "33982": "Punta Gorda",
  "33983": "Punta Gorda",
};

/**
 * Match a zip code to a supported SWFL city
 * Returns the city name or null if not in our coverage area
 */
export function matchZipToCity(zip: string): SupportedCity | null {
  return ZIP_MAP[zip] || null;
}

/**
 * Get all supported cities
 */
export const SUPPORTED_CITIES: SupportedCity[] = [
  "Cape Coral",
  "Fort Myers",
  "Naples",
  "Bonita Springs",
  "Lehigh Acres",
  "Punta Gorda",
];

/**
 * Check if a zip code is in our coverage area
 */
export function isZipSupported(zip: string): boolean {
  return zip in ZIP_MAP;
}
