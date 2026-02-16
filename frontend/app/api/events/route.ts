import { NextResponse } from "next/server";
import { searchEvents, LLMSettings } from "@/lib/local-intel";
import { classifyEvent, isAIClassificationEnabled } from "@/lib/ai-classifier";
import { generateEventId } from "@/lib/utils";
import { extractKeywords, extractEntities } from "@/lib/event-classifier";
import { translateArticle } from "@/lib/translator";
import type { ThreatEvent } from "@/types";

export const dynamic = "force-dynamic";

// Minimum number of articles before triggering fallback
const MIN_ARTICLES_THRESHOLD = 5;

// General news search queries (not threat-focused)
const GENERAL_NEWS_QUERIES = [
  "breaking news today headlines",
  "politics government policy",
  "economy business markets",
  "technology innovation",
  "society culture events",
];

// Clean boilerplate from content
function cleanContent(text: string): string {
  return text
    .replace(/skip to (?:main |primary )?content/gi, "")
    .replace(/keyboard shortcuts?/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Filter out non-news sources and generic pages
const BLOCKED_DOMAINS = [
  "wikipedia.org",
  "brighteon.com",
  "fortinet.com",
  "cisa.gov",
];

const GENERIC_TITLE_PATTERNS = [
  /\| topic$/i,
  /\| homeland security$/i,
  /\| fortinet$/i,
  /^natural disasters$/i,
  /^countering terrorism$/i,
  /^maritime piracy:/i,
  /^assessment of global/i,
  /^recent cyber attacks in \d{4}/i,
];

// Validate location is real (not garbage text)
function isValidLocation(location: { placeName?: string; country?: string }): boolean {
  const name = location.placeName || location.country || "";
  // Skip if contains non-Latin scripts that aren't common (Arabic, Chinese, etc are ok)
  // But garbage like "گۆپاڵ" or "Routes" should be filtered
  if (name.length < 2) return false;
  if (name.toLowerCase() === "routes") return false;
  if (/^[a-z\s]+$/i.test(name) && name.length < 3) return false;
  // Check for suspiciously short or generic names
  if (["unknown", "global", "worldwide", "n/a"].includes(name.toLowerCase())) return false;
  return true;
}

// Threat level priority for sorting
const THREAT_LEVEL_PRIORITY: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

async function processSearchResults(
  results: Array<{ title: string; url: string; content: string; publishedDate?: string; source?: string }>,
  options?: { llmSettings?: LLMSettings; enableTranslation?: boolean },
): Promise<ThreatEvent[]> {
  // Pre-filter results before processing
  const filteredResults = results.filter((result) => {
    // Skip blocked domains
    const url = result.url.toLowerCase();
    if (BLOCKED_DOMAINS.some((domain) => url.includes(domain))) {
      return false;
    }
    // Skip generic informational pages
    const title = result.title;
    if (GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(title))) {
      return false;
    }
    return true;
  });

  // Deduplicate by URL before processing (faster than after)
  const seenUrls = new Set<string>();
  const uniqueResults = filteredResults.filter((result) => {
    // Normalize URL (remove query params, trailing slashes)
    const normalizedUrl = result.url.split("?")[0].replace(/\/$/, "").toLowerCase();
    if (seenUrls.has(normalizedUrl)) return false;
    seenUrls.add(normalizedUrl);
    return true;
  });

  const eventsWithLocations = await Promise.all(
    uniqueResults.map(async (result) => {
      let cleanedTitle = cleanContent(result.title);
      let cleanedContent = cleanContent(result.content);

      // Translate if enabled and LLM settings provided
      if (options?.enableTranslation && options?.llmSettings) {
        try {
          const translation = await translateArticle(
            cleanedTitle,
            cleanedContent,
            options.llmSettings
          );
          if (translation.wasTranslated) {
            cleanedTitle = translation.translatedTitle;
            cleanedContent = translation.translatedContent;
            console.log(`[Translation] Translated from ${translation.originalLanguage}: ${cleanedTitle.slice(0, 50)}...`);
          }
        } catch (error) {
          console.error("[Translation] Error translating article:", error);
          // Continue with original text if translation fails
        }
      }

      const fullText = `${cleanedTitle} ${cleanedContent}`;

      // Use AI classification (falls back to keywords if LLM not available)
      const classification = await classifyEvent(cleanedTitle, cleanedContent, options?.llmSettings);

      // Skip events without valid locations
      if (!classification.location || !isValidLocation(classification.location)) {
        return null;
      }

      const event: ThreatEvent = {
        id: generateEventId(),
        title: cleanedTitle,
        summary: cleanedContent.slice(0, 500),
        category: classification.category,
        threatLevel: classification.threatLevel,
        location: classification.location,
        timestamp: result.publishedDate || new Date().toISOString(),
        source: result.source || "web",
        sourceUrl: result.url,
        entities: extractEntities(fullText),
        keywords: extractKeywords(fullText),
        rawContent: cleanedContent,
      };

      return event;
    })
  );

  const validEvents = eventsWithLocations.filter(
    (event): event is ThreatEvent => event !== null
  );

  // Further deduplicate by title similarity
  const uniqueEvents = validEvents.filter(
    (event, index, self) =>
      index === self.findIndex((e) => e.title === event.title)
  );

  // Sort by threat level first, then by date
  return uniqueEvents.sort((a, b) => {
    const priorityA = THREAT_LEVEL_PRIORITY[a.threatLevel] ?? 5;
    const priorityB = THREAT_LEVEL_PRIORITY[b.threatLevel] ?? 5;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return dateB - dateA;
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const country = searchParams.get("country");

  try {
    // If country is specified, use strictCountry mode
    if (country) {
      const searchResultsArrays = await Promise.all(
        GENERAL_NEWS_QUERIES.map((q) =>
          searchEvents(q, { maxResults: 10, strictCountry: country })
        )
      );
      const allResults = searchResultsArrays.flatMap((r) => r.results);
      const sortedEvents = await processSearchResults(allResults);

      return NextResponse.json({
        events: sortedEvents,
        count: sortedEvents.length,
        region: country,
        timestamp: new Date().toISOString(),
      });
    }

    // Fallback to query-based search
    const searchQueries = query ? [query] : GENERAL_NEWS_QUERIES;
    const searchResultsArrays = await Promise.all(
      searchQueries.map((q) => searchEvents(q, { maxResults: 20 }))
    );

    const allResults = searchResultsArrays.flatMap((r) => r.results);
    const sortedEvents = await processSearchResults(allResults);

    return NextResponse.json({
      events: sortedEvents,
      count: sortedEvents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

/**
 * POST handler for "Follow the Sun" regional news fetching
 * Accepts { countries: string[], region?: string, includeFallback?: boolean }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { countries, region, includeFallback = true, llmSettings, enableTranslation = false } = body;

    const processOptions = {
      llmSettings: llmSettings as LLMSettings | undefined,
      enableTranslation: enableTranslation as boolean,
    };

    // If countries provided, fetch from those countries
    if (countries && Array.isArray(countries) && countries.length > 0) {
      console.log(`[events/POST] Fetching news for countries: ${countries.join(", ")}`);

      // Fetch news from each country in parallel
      const countryResults = await Promise.all(
        countries.map(async (country: string) => {
          // Use multiple general queries per country to get diverse headlines
          const queries = GENERAL_NEWS_QUERIES.slice(0, 3);
          const results = await Promise.all(
            queries.map((q) =>
              searchEvents(q, { maxResults: 8, strictCountry: country })
            )
          );
          return results.flatMap((r) => r.results);
        })
      );

      let allResults = countryResults.flat();
      console.log(`[events/POST] Got ${allResults.length} articles from primary countries`);
      if (enableTranslation) {
        console.log(`[events/POST] Translation enabled with provider: ${llmSettings?.provider || "default"}`);
      }

      // If not enough results and fallback enabled, the hook will handle requesting more
      const sortedEvents = await processSearchResults(allResults, processOptions);

      return NextResponse.json({
        events: sortedEvents,
        count: sortedEvents.length,
        region: region || countries.join(", "),
        needsFallback: sortedEvents.length < MIN_ARTICLES_THRESHOLD && includeFallback,
        timestamp: new Date().toISOString(),
      });
    }

    // Fallback: no countries specified, use general search
    console.log("[events/POST] No countries specified, using general search");
    const searchResultsArrays = await Promise.all(
      GENERAL_NEWS_QUERIES.map((q) => searchEvents(q, { maxResults: 20 }))
    );

    const allResults = searchResultsArrays.flatMap((r) => r.results);
    const sortedEvents = await processSearchResults(allResults, processOptions);

    return NextResponse.json({
      events: sortedEvents,
      count: sortedEvents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
