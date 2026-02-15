/**
 * Follow the Sun - Timezone-based news fetching
 * Fetches news from whichever region is currently at 12pm (noon)
 */

export interface TimezoneBand {
  utcOffset: number;
  displayName: string;
  countries: string[];
}

// Timezone bands mapped to countries from local_news_sources.json
export const TIMEZONE_BANDS: TimezoneBand[] = [
  {
    utcOffset: 12,
    displayName: "New Zealand",
    countries: ["new_zealand"],
  },
  {
    utcOffset: 10,
    displayName: "Australia",
    countries: ["australia"],
  },
  {
    utcOffset: 9,
    displayName: "Japan & Korea",
    countries: ["japan", "south_korea"],
  },
  {
    utcOffset: 8,
    displayName: "East Asia",
    countries: ["china", "taiwan", "singapore", "philippines", "malaysia"],
  },
  {
    utcOffset: 7,
    displayName: "Southeast Asia",
    countries: ["vietnam", "thailand", "indonesia"],
  },
  {
    utcOffset: 5.5,
    displayName: "India",
    countries: ["india"],
  },
  {
    utcOffset: 5,
    displayName: "South Asia",
    countries: ["pakistan", "bangladesh"],
  },
  {
    utcOffset: 4,
    displayName: "Gulf States",
    countries: ["uae", "oman"],
  },
  {
    utcOffset: 3,
    displayName: "Middle East & East Africa",
    countries: ["turkey", "saudi_arabia", "kenya", "russia", "israel", "iraq", "qatar", "ethiopia"],
  },
  {
    utcOffset: 2,
    displayName: "Eastern Europe & Africa",
    countries: ["poland", "ukraine", "romania", "south_africa", "egypt", "greece", "finland"],
  },
  {
    utcOffset: 1,
    displayName: "Central Europe",
    countries: ["germany", "france", "italy", "spain", "netherlands", "belgium", "sweden", "norway", "denmark", "austria", "switzerland", "czech_republic", "hungary", "nigeria", "morocco", "algeria"],
  },
  {
    utcOffset: 0,
    displayName: "Western Europe",
    countries: ["uk", "ireland", "portugal", "ghana"],
  },
  {
    utcOffset: -3,
    displayName: "South America",
    countries: ["brazil", "argentina", "chile"],
  },
  {
    utcOffset: -5,
    displayName: "Americas East",
    countries: ["us", "colombia", "peru", "canada", "cuba", "ecuador"],
  },
  {
    utcOffset: -6,
    displayName: "Mexico & Central America",
    countries: ["mexico", "costa_rica", "guatemala", "honduras", "el_salvador", "nicaragua"],
  },
  {
    utcOffset: -8,
    displayName: "US Pacific",
    countries: ["us"], // California, West Coast
  },
];

/**
 * Get the current UTC hour
 */
export function getCurrentUTCHour(): number {
  return new Date().getUTCHours();
}

/**
 * Calculate which timezone band is currently at noon (12pm)
 * If UTC is 10:00, then UTC+2 is at 12:00
 * Formula: noonOffset = 12 - currentUTCHour
 */
export function getCurrentNoonOffset(): number {
  const utcHour = getCurrentUTCHour();
  // At noon, we want to find which UTC offset is at 12pm
  // If it's 10:00 UTC, then UTC+2 is at 12:00
  // If it's 14:00 UTC, then UTC-2 is at 12:00
  return 12 - utcHour;
}

/**
 * Find the timezone band closest to the target offset
 */
export function findClosestBand(targetOffset: number): TimezoneBand {
  // Sort bands by how close they are to target offset
  const sorted = [...TIMEZONE_BANDS].sort((a, b) => {
    const diffA = Math.abs(a.utcOffset - targetOffset);
    const diffB = Math.abs(b.utcOffset - targetOffset);
    return diffA - diffB;
  });
  return sorted[0];
}

/**
 * Get the timezone band that is currently at noon
 */
export function getCurrentNoonBand(): TimezoneBand {
  const noonOffset = getCurrentNoonOffset();
  return findClosestBand(noonOffset);
}

/**
 * Get fallback bands (adjacent timezones) for when primary band has insufficient results
 */
export function getFallbackBands(primaryBand: TimezoneBand): TimezoneBand[] {
  const offset = primaryBand.utcOffset;

  // Get bands that are ±1-2 hours from primary
  const fallbacks = TIMEZONE_BANDS.filter((band) => {
    const diff = Math.abs(band.utcOffset - offset);
    return diff > 0 && diff <= 2;
  });

  // Sort by proximity to primary band
  return fallbacks.sort((a, b) => {
    const diffA = Math.abs(a.utcOffset - offset);
    const diffB = Math.abs(b.utcOffset - offset);
    return diffA - diffB;
  });
}

/**
 * Get milliseconds until the next hour (for scheduling refresh)
 */
export function getMsUntilNextHour(): number {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  return nextHour.getTime() - now.getTime();
}

/**
 * Get a formatted countdown string (e.g., "42m")
 */
export function getCountdownString(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "<1m";
  return `${minutes}m`;
}

/**
 * Get all countries for fetching (primary + fallbacks if needed)
 */
export function getCountriesForFetching(primaryBand: TimezoneBand, includeFallbacks: boolean = false): string[] {
  const countries = [...primaryBand.countries];

  if (includeFallbacks) {
    const fallbacks = getFallbackBands(primaryBand);
    for (const band of fallbacks) {
      for (const country of band.countries) {
        if (!countries.includes(country)) {
          countries.push(country);
        }
      }
    }
  }

  return countries;
}
