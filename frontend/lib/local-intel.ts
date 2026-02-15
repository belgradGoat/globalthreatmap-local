/**
 * Local Intelligence Integration Layer
 * Replaces Valyu with WebScrapper (Eagle Watchtower) + LM Studio/Ollama/OpenAI
 */

// WebScrapper API configuration
const WEBSCRAPPER_URL = process.env.WEBSCRAPPER_URL || "http://localhost:3001";
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || "http://localhost:8001";

// LLM Provider Types
export type LLMProvider = "lmstudio" | "ollama" | "openai-compatible" | "openai";

export interface LLMSettings {
  provider: LLMProvider;
  serverUrl: string;
  model: string;
  apiKey: string;
}

// Default LLM settings (from environment or sensible defaults)
const DEFAULT_LLM_SETTINGS: LLMSettings = {
  provider: (process.env.LLM_PROVIDER as LLMProvider) || "lmstudio",
  serverUrl: process.env.LM_STUDIO_URL || "http://localhost:1234/v1",
  model: process.env.LLM_MODEL || "",
  apiKey: process.env.OPENAI_API_KEY || "",
};

// Check if local services are enabled
export function isLocalIntelEnabled(): boolean {
  return process.env.USE_LOCAL_INTEL === "true";
}

// ============================================================================
// DYNAMIC CONFIGURATION - Syncs regions/countries from WebScrapper
// ============================================================================

interface RegionConfig {
  regions: Record<string, string[]>;
  countries: string[];
  stats: {
    totalSources: number;
    byRegion: Record<string, number>;
    byCountry?: Record<string, number>;
  };
  lastUpdated: string;
}

// Cache for dynamic config
let cachedRegionConfig: RegionConfig | null = null;
let configLastFetch = 0;
const CONFIG_CACHE_TTL = 3600000; // 1 hour

/**
 * Fetch region configuration from WebScrapper
 * Caches for 1 hour to avoid repeated requests
 */
export async function fetchRegionConfig(): Promise<RegionConfig | null> {
  const now = Date.now();

  // Return cached config if still fresh
  if (cachedRegionConfig && now - configLastFetch < CONFIG_CACHE_TTL) {
    return cachedRegionConfig;
  }

  try {
    const response = await fetch(`${WEBSCRAPPER_URL}/api/config/regions`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`Failed to fetch region config: ${response.status}`);
      return cachedRegionConfig; // Return stale cache if available
    }

    cachedRegionConfig = await response.json();
    configLastFetch = now;
    console.log(`✅ Fetched region config from WebScrapper: ${cachedRegionConfig?.stats?.totalSources} sources`);
    return cachedRegionConfig;
  } catch (error) {
    console.error("Error fetching region config:", error);
    return cachedRegionConfig; // Return stale cache if available
  }
}

/**
 * Get list of available countries from WebScrapper config
 */
export async function getAvailableCountries(): Promise<string[]> {
  const config = await fetchRegionConfig();
  return config?.countries || [];
}

/**
 * Get region for a country from dynamic config
 */
export async function getRegionForCountry(country: string): Promise<string | null> {
  const config = await fetchRegionConfig();
  if (!config) return null;

  const lowerCountry = country.toLowerCase();
  for (const [region, countries] of Object.entries(config.regions)) {
    if (countries.includes(lowerCountry)) {
      return region;
    }
  }
  return null;
}

/**
 * Suggest new RSS source to WebScrapper
 */
export async function suggestNewSource(
  region: string,
  country: string | undefined,
  source: { name: string; url: string; language?: string; bias?: string }
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${WEBSCRAPPER_URL}/api/config/add-source`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ region, country, source }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, message: data.error || "Failed to add source" };
    }

    // Invalidate cache so next fetch gets the new source
    cachedRegionConfig = null;
    configLastFetch = 0;

    return { success: true, message: data.message || "Source added successfully" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// DATE CONTEXT - Helps LLM understand current time context
// ============================================================================

/**
 * Get current date context for LLM prompts
 * This helps the LLM understand what "current" means
 */
function getDateContext(): { dateString: string; year: number; context: string } {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const dateString = now.toLocaleDateString("en-US", options);
  const year = now.getFullYear();

  return {
    dateString,
    year,
    context: `Today is ${dateString}. The current year is ${year}. When analyzing news and conflicts, focus on events from ${year} and recent months. Do not reference outdated information from previous years unless discussing historical context.`,
  };
}

// ============================================================================
// NEWS SEARCH - Replaces valyu.search()
// ============================================================================

interface SearchResult {
  title: string;
  url: string;
  content: string;
  publishedDate?: string;
  source?: string;
  sourceCountry?: string; // Country from WebScrapper's source metadata
}

interface SearchOptions {
  maxResults?: number;
  language?: string;
  country?: string;
  accessToken?: string; // Ignored in local mode, kept for API compatibility
}

// Region mapping for local sources - maps country names to their regions in local_news_sources.json
const REGION_MAP: Record<string, string[]> = {
  // EASTERN EUROPE
  poland: ["eastern_europe"],
  ukraine: ["eastern_europe"],
  russia: ["eastern_europe"],
  czech: ["eastern_europe"],
  czechia: ["eastern_europe"],
  hungary: ["eastern_europe"],
  romania: ["eastern_europe"],
  bulgaria: ["eastern_europe"],
  lithuania: ["eastern_europe"],
  latvia: ["eastern_europe"],
  estonia: ["eastern_europe"],
  slovakia: ["eastern_europe"],
  moldova: ["eastern_europe"],
  belarus: ["eastern_europe"],
  georgia: ["eastern_europe"],
  serbia: ["eastern_europe"],
  croatia: ["eastern_europe"],
  slovenia: ["eastern_europe"],
  bosnia: ["eastern_europe"],
  kosovo: ["eastern_europe"],
  albania: ["eastern_europe"],
  north_macedonia: ["eastern_europe"],
  macedonia: ["eastern_europe"],
  montenegro: ["eastern_europe"],

  // MIDDLE EAST
  israel: ["middle_east"],
  iran: ["middle_east"],
  iraq: ["middle_east"],
  turkey: ["middle_east"],
  turkiye: ["middle_east"],
  syria: ["middle_east"],
  lebanon: ["middle_east"],
  jordan: ["middle_east"],
  saudi: ["middle_east"],
  saudi_arabia: ["middle_east"],
  uae: ["middle_east"],
  emirates: ["middle_east"],
  qatar: ["middle_east"],
  kuwait: ["middle_east"],
  bahrain: ["middle_east"],
  oman: ["middle_east"],
  yemen: ["middle_east"],
  palestine: ["middle_east"],
  gaza: ["middle_east"],

  // WESTERN EUROPE
  germany: ["western_europe"],
  france: ["western_europe"],
  uk: ["western_europe"],
  britain: ["western_europe"],
  england: ["western_europe"],
  scotland: ["western_europe"],
  wales: ["western_europe"],
  italy: ["western_europe"],
  spain: ["western_europe"],
  portugal: ["western_europe"],
  netherlands: ["western_europe"],
  belgium: ["western_europe"],
  austria: ["western_europe"],
  switzerland: ["western_europe"],
  greece: ["western_europe"],
  ireland: ["western_europe"],
  norway: ["western_europe"],
  sweden: ["western_europe"],
  finland: ["western_europe"],
  denmark: ["western_europe"],
  iceland: ["western_europe"],

  // EAST ASIA
  china: ["east_asia"],
  japan: ["east_asia"],
  south_korea: ["east_asia"],
  korea: ["east_asia"],
  taiwan: ["east_asia"],
  north_korea: ["east_asia"],

  // CENTRAL ASIA
  kazakhstan: ["central_asia"],
  uzbekistan: ["central_asia"],
  turkmenistan: ["central_asia"],
  kyrgyzstan: ["central_asia"],
  tajikistan: ["central_asia"],
  afghanistan: ["central_asia", "south_asia"],

  // SOUTHEAST ASIA
  singapore: ["southeast_asia"],
  indonesia: ["southeast_asia"],
  philippines: ["southeast_asia"],
  vietnam: ["southeast_asia"],
  thailand: ["southeast_asia"],
  malaysia: ["southeast_asia"],
  myanmar: ["southeast_asia"],
  burma: ["southeast_asia"],
  cambodia: ["southeast_asia"],
  laos: ["southeast_asia"],

  // SOUTH ASIA
  india: ["south_asia"],
  pakistan: ["south_asia"],
  bangladesh: ["south_asia"],
  sri_lanka: ["south_asia"],
  nepal: ["south_asia"],

  // AMERICAS
  usa: ["north_america"],
  us: ["north_america"],
  united_states: ["north_america"],
  america: ["north_america"],
  canada: ["north_america"],
  mexico: ["north_america"],
  brazil: ["south_america"],
  argentina: ["south_america"],
  colombia: ["south_america"],
  venezuela: ["south_america"],
  chile: ["south_america"],
  peru: ["south_america"],
  cuba: ["south_america"],

  // OCEANIA
  australia: ["oceania"],
  new_zealand: ["oceania"],

  // AFRICA
  nigeria: ["africa"],
  kenya: ["africa"],
  egypt: ["africa", "middle_east"],
  south_africa: ["africa"],
  ethiopia: ["africa"],
  sudan: ["africa"],
  libya: ["africa"],
  morocco: ["africa"],
  algeria: ["africa"],
  tunisia: ["africa"],
  somalia: ["africa"],
  dr_congo: ["africa"],
  congo: ["africa"],
};

// Keywords that suggest specific regions
const REGION_KEYWORDS: Record<string, string[]> = {
  eastern_europe: ["nato", "eu expansion", "baltic", "visegrad", "crimea", "donbas", "balkans", "western balkans"],
  middle_east: ["hamas", "hezbollah", "gaza", "west bank", "iranian", "gulf", "opec", "abraham accords", "houthi"],
  western_europe: ["european union", "brexit", "schengen", "eurozone", "eu parliament", "european commission"],
  nordic: ["arctic", "nordic council", "svalbard", "greenland", "faroe"],
  east_asia: ["taiwan strait", "south china sea", "korean peninsula", "dmz", "senkaku", "diaoyu", "thaad"],
  central_asia: ["silk road", "csto", "shanghai cooperation", "stan"],
  south_america: ["mercosur", "latin america", "amazon", "cartel"],
  north_america: ["border", "fentanyl", "nafta", "usmca"],
  africa: ["sahel", "boko haram", "coup", "african union", "ecowas", "sadc"],
  southeast_asia: ["asean", "south china sea", "mekong", "rohingya"],
  south_asia: ["kashmir", "saarc", "himalayan", "line of control"],
};

// ============================================================================
// COUNTRY-SPECIFIC LOCAL KEYWORDS
// Imported from comprehensive country-keywords.ts module
// Contains native language keywords for 80+ countries
// ============================================================================
import { getCountryKeywords } from './country-keywords';

/**
 * Detect relevant regions from a query
 */
function detectRegions(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const regions = new Set<string>();

  // Check country mentions
  for (const [country, countryRegions] of Object.entries(REGION_MAP)) {
    if (lowerQuery.includes(country)) {
      countryRegions.forEach(r => regions.add(r));
    }
  }

  // Check keyword mentions
  for (const [region, keywords] of Object.entries(REGION_KEYWORDS)) {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      regions.add(region);
    }
  }

  return Array.from(regions);
}

interface ExtendedSearchOptions extends SearchOptions {
  useLocalSources?: boolean;
  useRegionalNews?: boolean;
  regions?: string[];
  strictCountry?: string; // Only return results from this specific country
}

// Country name aliases - maps common names to WebScrapper API format
const WEBSCRAPPER_COUNTRY_ALIASES: Record<string, string> = {
  'united states': 'us',
  'united_states': 'us',
  'america': 'us',
  'usa': 'us',
  'united kingdom': 'uk',
  'united_kingdom': 'uk',
  'britain': 'uk',
  'great britain': 'uk',
  'england': 'uk',
  'south korea': 'south_korea',
  'korea': 'south_korea',
  'north korea': 'north_korea',
  'saudi arabia': 'saudi_arabia',
  'czech republic': 'czech',
  'czechia': 'czech',
  'united arab emirates': 'uae',
  'south africa': 'south_africa',
  'new zealand': 'new_zealand',
  'north macedonia': 'north_macedonia',
  'sri lanka': 'sri_lanka',
  'dr congo': 'dr_congo',
  'turkiye': 'turkey',
  'türkiye': 'turkey',
};

/**
 * Normalize country name to WebScrapper API format
 * E.g., "United States" → "us", "South Korea" → "south_korea"
 */
function normalizeCountryForApi(country: string): string {
  const lower = country.toLowerCase().trim();
  // Check aliases first
  if (WEBSCRAPPER_COUNTRY_ALIASES[lower]) {
    return WEBSCRAPPER_COUNTRY_ALIASES[lower];
  }
  // Replace spaces with underscores for multi-word countries
  return lower.replace(/\s+/g, '_');
}

/**
 * Search for news using WebScrapper's multi-source aggregation
 * Sources: GNews, Guardian, Google News RSS, Local RSS feeds (90+)
 * Automatically detects relevant regions and includes local sources
 *
 * When strictCountry is set, ONLY fetches from that country's local sources
 * and filters results to ensure they come from that country.
 */
export async function searchEvents(
  query: string,
  options?: ExtendedSearchOptions
): Promise<{ results: SearchResult[]; requiresReauth?: boolean }> {
  try {
    const maxResults = options?.maxResults || 20;
    // Normalize country name for WebScrapper API (e.g., "United States" → "us")
    const strictCountry = options?.strictCountry
      ? normalizeCountryForApi(options.strictCountry)
      : undefined;

    // ========================================================================
    // STRICT COUNTRY MODE: Only fetch from the specified country's sources
    // ========================================================================
    if (strictCountry) {
      const allResults: SearchResult[] = [];
      const seenUrls = new Set<string>();

      // WebScrapper's findSourcesForRegion() supports passing country name directly
      // e.g., region=cuba will return only Cuba's feeds, not all of south_america
      const regionParams = new URLSearchParams();
      regionParams.set("region", strictCountry);  // Pass country name directly - WebScrapper handles it
      regionParams.set("keywords", query);
      regionParams.set("limit", String(maxResults));

      console.log(`[searchEvents] Fetching for ${strictCountry}: ${WEBSCRAPPER_URL}/api/local-sources?${regionParams}`);

      try {
        const localResponse = await fetch(`${WEBSCRAPPER_URL}/api/local-sources?${regionParams}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (localResponse.ok) {
          const localData = await localResponse.json();
          console.log(`[searchEvents] Local sources returned ${localData.articles?.length || 0} articles for ${strictCountry}`);
          for (const article of localData.articles || []) {
            const url = article.url || "";
            if (url && !seenUrls.has(url)) {
              seenUrls.add(url);
              allResults.push({
                title: article.title || "Untitled",
                url,
                content: article.description || article.content || "",
                publishedDate: article.publishedAt || article.pubDate,
                source: article.source?.name || article.sourceName || "Local Source",
                sourceCountry: article.source?.country || strictCountry,
              });
            }
          }
          console.log(`[searchEvents] Added ${allResults.length} articles for ${strictCountry}`);
        } else {
          console.error(`[searchEvents] Local sources API returned ${localResponse.status} for ${strictCountry}`);
        }
      } catch (error) {
        console.error(`Local sources fetch failed for ${strictCountry}:`, error);
      }

      // Also fetch regional Google News for this specific country
      const googleParams = new URLSearchParams({
        keywords: query,
        region: strictCountry,
        limit: String(Math.ceil(maxResults / 2)),
      });

      try {
        const googleResponse = await fetch(`${WEBSCRAPPER_URL}/api/google-news-local?${googleParams}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (googleResponse.ok) {
          const googleData = await googleResponse.json();
          for (const article of googleData.articles || []) {
            const url = article.url || "";
            if (url && !seenUrls.has(url)) {
              seenUrls.add(url);
              allResults.push({
                title: article.title || "Untitled",
                url,
                content: article.description || article.content || "",
                publishedDate: article.publishedAt || article.pubDate,
                source: article.source?.name || `Google News (${strictCountry})`,
                sourceCountry: strictCountry,
              });
            }
          }
        }
      } catch (error) {
        console.error(`Google News fetch failed for ${strictCountry}:`, error);
      }

      // Sort by date (newest first)
      allResults.sort((a, b) => {
        const dateA = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
        const dateB = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
        return dateB - dateA;
      });

      return { results: allResults.slice(0, maxResults) };
    }

    // ========================================================================
    // NORMAL MODE: Multi-region search (existing behavior)
    // ========================================================================
    const useLocalSources = options?.useLocalSources !== false; // Default true
    const useRegionalNews = options?.useRegionalNews !== false; // Default true

    // Start with global news search
    const globalParams = new URLSearchParams({
      keyword: query,
      lang: options?.language || "en",
      country: options?.country || "us",
      max: String(Math.ceil(maxResults / 2)), // Half from global
    });

    const globalPromise = fetch(`${WEBSCRAPPER_URL}/api/news?${globalParams}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    // Detect relevant regions
    const detectedRegions = options?.regions || detectRegions(query);
    const localPromises: Promise<Response>[] = [];
    const regionalPromises: Promise<Response>[] = [];

    if (useLocalSources && detectedRegions.length > 0) {
      // Fetch from local RSS sources for detected regions
      for (const region of detectedRegions.slice(0, 3)) { // Max 3 regions
        const localParams = new URLSearchParams({
          region,
          keywords: query,
          limit: String(Math.ceil(maxResults / 4)),
        });
        localPromises.push(
          fetch(`${WEBSCRAPPER_URL}/api/local-sources?${localParams}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }).catch(() => new Response(JSON.stringify({ articles: [] })))
        );
      }
    }

    if (useRegionalNews && detectedRegions.length > 0) {
      // Fetch regional Google News for detected countries
      const countries = Object.entries(REGION_MAP)
        .filter(([, regions]) => regions.some(r => detectedRegions.includes(r)))
        .map(([country]) => country)
        .slice(0, 3); // Max 3 countries

      for (const country of countries) {
        const regionalParams = new URLSearchParams({
          keyword: query,
          country,
          max: String(Math.ceil(maxResults / 6)),
        });
        regionalPromises.push(
          fetch(`${WEBSCRAPPER_URL}/api/google-news-local?${regionalParams}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }).catch(() => new Response(JSON.stringify({ articles: [] })))
        );
      }
    }

    // Wait for all requests
    const [globalResponse, ...otherResponses] = await Promise.all([
      globalPromise,
      ...localPromises,
      ...regionalPromises,
    ]);

    const allResults: SearchResult[] = [];
    const seenUrls = new Set<string>();

    // Helper to add results without duplicates
    const addResults = (articles: any[], sourceLabel?: string, defaultCountry?: string) => {
      for (const article of articles) {
        const url = article.url || "";
        if (url && !seenUrls.has(url)) {
          seenUrls.add(url);
          allResults.push({
            title: article.title || "Untitled",
            url,
            content: article.description || article.content || "",
            publishedDate: article.publishedAt || article.pubDate,
            source: sourceLabel || article.source?.name || article.sourceName || "Unknown",
            sourceCountry: article.source?.country || defaultCountry,
          });
        }
      }
    };

    // Process global results
    if (globalResponse.ok) {
      const globalData = await globalResponse.json();
      addResults(globalData.articles || []);
    }

    // Process local and regional results
    for (const response of otherResponses) {
      if (response.ok) {
        try {
          const data = await response.json();
          const regionLabel = data.region ? `Local (${data.region})` : undefined;
          addResults(data.articles || [], regionLabel, data.region);
        } catch {
          // Skip malformed responses
        }
      }
    }

    // Sort by date (newest first) and limit
    allResults.sort((a, b) => {
      const dateA = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
      const dateB = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
      return dateB - dateA;
    });

    return {
      results: allResults.slice(0, maxResults),
    };
  } catch (error) {
    console.error("Local search error:", error);
    return { results: [] };
  }
}

/**
 * Search local news sources by region
 * Uses WebScrapper's 90+ RSS feeds across 10 regions
 */
export async function searchLocalSources(
  region: string,
  keywords: string,
  limit: number = 20
): Promise<SearchResult[]> {
  try {
    const params = new URLSearchParams({
      region,
      keywords,
      limit: String(limit),
    });

    const response = await fetch(`${WEBSCRAPPER_URL}/api/local-sources?${params}`);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return (data.articles || []).map((article: any) => ({
      title: article.title || "Untitled",
      url: article.url || "",
      content: article.description || article.content || "",
      publishedDate: article.publishedAt || article.pubDate,
      source: article.source?.name || article.sourceName || "Local Source",
    }));
  } catch (error) {
    console.error("Local sources search error:", error);
    return [];
  }
}

/**
 * Search social media (Bluesky, Reddit)
 */
export async function searchSocialMedia(
  platform: "bluesky" | "reddit",
  query: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const response = await fetch(`${WEBSCRAPPER_URL}/api/${platform}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit }),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.posts || [];
  } catch (error) {
    console.error(`Social media search error (${platform}):`, error);
    return [];
  }
}

// ============================================================================
// LLM ANALYSIS - Supports LM Studio, Ollama, OpenAI-compatible, OpenAI Cloud
// ============================================================================

/**
 * Get the chat completions endpoint for a provider
 */
function getLLMEndpoint(settings: LLMSettings): string {
  const baseUrl = settings.serverUrl.replace(/\/$/, "");

  switch (settings.provider) {
    case "ollama":
      return `${baseUrl}/api/chat`;
    case "lmstudio":
    case "openai-compatible":
    case "openai":
    default:
      return `${baseUrl}/chat/completions`;
  }
}

/**
 * Format request body for different LLM providers
 */
function formatLLMRequest(
  settings: LLMSettings,
  messages: { role: string; content: string }[],
  options: { temperature?: number; maxTokens?: number; stream?: boolean }
): object {
  const baseRequest = {
    messages,
    temperature: options.temperature ?? 0.7,
    stream: options.stream ?? false,
  };

  switch (settings.provider) {
    case "ollama":
      if (!settings.model) {
        console.error("[LLM] Ollama requires a model name. Please set one in Settings.");
      }
      return {
        ...baseRequest,
        model: settings.model || "llama3.2", // Fallback, but will fail if model doesn't exist
        options: {
          num_predict: options.maxTokens ?? 2000,
        },
      };

    case "lmstudio":
    case "openai-compatible":
    case "openai":
    default:
      return {
        ...baseRequest,
        model: settings.model || undefined,
        max_tokens: options.maxTokens ?? 2000,
      };
  }
}

/**
 * Get headers for LLM API request
 */
function getLLMHeaders(settings: LLMSettings): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (settings.provider === "openai" && settings.apiKey) {
    headers["Authorization"] = `Bearer ${settings.apiKey}`;
  }

  return headers;
}

/**
 * Parse response from different LLM providers
 */
function parseLLMResponse(settings: LLMSettings, data: any): string {
  switch (settings.provider) {
    case "ollama":
      return data.message?.content || "";
    case "lmstudio":
    case "openai-compatible":
    case "openai":
    default:
      return data.choices?.[0]?.message?.content || "";
  }
}

/**
 * Generate AI response using configured LLM provider
 * Supports: LM Studio, Ollama, OpenAI-compatible servers, OpenAI Cloud
 */
export async function generateLLMResponse(
  prompt: string,
  systemMessage?: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
    llmSettings?: LLMSettings;
  }
): Promise<string> {
  try {
    const settings = options?.llmSettings || DEFAULT_LLM_SETTINGS;
    const messages: { role: string; content: string }[] = [];

    console.log(`[LLM] Using provider: ${settings.provider}, URL: ${settings.serverUrl}, model: ${settings.model || "(default)"}`);

    if (systemMessage) {
      messages.push({ role: "system", content: systemMessage });
    }
    messages.push({ role: "user", content: prompt });

    const controller = new AbortController();
    const timeout = options?.timeout || 120000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const endpoint = getLLMEndpoint(settings);
    const body = formatLLMRequest(settings, messages, {
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      stream: false,
    });
    const headers = getLLMHeaders(settings);

    console.log(`[LLM] Calling ${endpoint}`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[LLM] Error response: ${errorText}`);
      throw new Error(`LLM error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = parseLLMResponse(settings, data);
    console.log(`[LLM] Got response: ${content.substring(0, 100)}...`);
    return content;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("[LLM] Request timed out");
    } else {
      console.error("[LLM] Error:", error);
    }
    return "";
  }
}

/**
 * Stream AI response using configured LLM provider
 * Supports: LM Studio, Ollama, OpenAI-compatible servers, OpenAI Cloud
 */
export async function* streamLLMResponse(
  prompt: string,
  systemMessage?: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    llmSettings?: LLMSettings;
  }
): AsyncGenerator<string> {
  try {
    const settings = options?.llmSettings || DEFAULT_LLM_SETTINGS;
    const messages: { role: string; content: string }[] = [];

    if (systemMessage) {
      messages.push({ role: "system", content: systemMessage });
    }
    messages.push({ role: "user", content: prompt });

    const endpoint = getLLMEndpoint(settings);
    const body = formatLLMRequest(settings, messages, {
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      stream: true,
    });
    const headers = getLLMHeaders(settings);

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      throw new Error(`LLM stream error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    if (settings.provider === "ollama") {
      // Ollama streams JSON objects, one per line
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(Boolean);

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content) {
              yield parsed.message.content;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } else {
      // OpenAI-compatible SSE format
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  } catch (error) {
    console.error("LLM stream error:", error);
  }
}

// ============================================================================
// ENTITY RESEARCH - Replaces valyu entity functions
// ============================================================================

type EntityType = "organization" | "person" | "country" | "group";

const COUNTRIES = new Set([
  "afghanistan", "albania", "algeria", "andorra", "angola", "argentina", "armenia",
  "australia", "austria", "azerbaijan", "bahamas", "bahrain", "bangladesh", "barbados",
  "belarus", "belgium", "belize", "benin", "bhutan", "bolivia", "bosnia", "botswana",
  "brazil", "brunei", "bulgaria", "burkina faso", "burundi", "cambodia", "cameroon",
  "canada", "cape verde", "central african republic", "chad", "chile", "china",
  "colombia", "comoros", "congo", "costa rica", "croatia", "cuba", "cyprus",
  "czech republic", "czechia", "denmark", "djibouti", "dominica", "dominican republic",
  "ecuador", "egypt", "el salvador", "equatorial guinea", "eritrea", "estonia",
  "eswatini", "ethiopia", "fiji", "finland", "france", "gabon", "gambia", "georgia",
  "germany", "ghana", "greece", "grenada", "guatemala", "guinea", "guinea-bissau",
  "guyana", "haiti", "honduras", "hungary", "iceland", "india", "indonesia", "iran",
  "iraq", "ireland", "israel", "italy", "ivory coast", "jamaica", "japan", "jordan",
  "kazakhstan", "kenya", "kiribati", "north korea", "south korea", "korea", "kosovo",
  "kuwait", "kyrgyzstan", "laos", "latvia", "lebanon", "lesotho", "liberia", "libya",
  "liechtenstein", "lithuania", "luxembourg", "madagascar", "malawi", "malaysia",
  "maldives", "mali", "malta", "marshall islands", "mauritania", "mauritius", "mexico",
  "micronesia", "moldova", "monaco", "mongolia", "montenegro", "morocco", "mozambique",
  "myanmar", "namibia", "nauru", "nepal", "netherlands", "new zealand", "nicaragua",
  "niger", "nigeria", "north macedonia", "norway", "oman", "pakistan", "palau",
  "palestine", "panama", "papua new guinea", "paraguay", "peru", "philippines", "poland",
  "portugal", "qatar", "romania", "russia", "rwanda", "saint kitts", "saint lucia",
  "saint vincent", "samoa", "san marino", "saudi arabia", "senegal", "serbia",
  "seychelles", "sierra leone", "singapore", "slovakia", "slovenia", "solomon islands",
  "somalia", "south africa", "south sudan", "spain", "sri lanka", "sudan", "suriname",
  "sweden", "switzerland", "syria", "taiwan", "tajikistan", "tanzania", "thailand",
  "timor-leste", "togo", "tonga", "trinidad", "tunisia", "turkey", "turkiye", "turkmenistan",
  "tuvalu", "uganda", "ukraine", "united arab emirates", "uae", "united kingdom", "uk",
  "united states", "usa", "us", "america", "uruguay", "uzbekistan", "vanuatu",
  "vatican", "venezuela", "vietnam", "yemen", "zambia", "zimbabwe",
]);

function classifyEntityType(name: string, content: string): EntityType {
  const lowerName = name.toLowerCase().trim();
  const lowerContent = content.toLowerCase();

  if (COUNTRIES.has(lowerName)) {
    return "country";
  }

  const countryIndicators = [
    "sovereign nation", "republic of", "kingdom of", "nation state",
    "government of", "country located", "bordered by", "capital city",
  ];
  const countryScore = countryIndicators.filter(ind => lowerContent.includes(ind)).length;

  const groupIndicators = [
    "ethnic group", "tribe", "tribal", "indigenous", "clan", "community",
    "militant group", "rebel group", "armed group", "terrorist organization",
    "militia", "faction", "insurgent", "separatist", "guerrilla",
  ];
  const groupScore = groupIndicators.filter(ind => lowerContent.includes(ind)).length;

  const personIndicators = [
    "was born", "born in", "died in", "biography", "personal life",
    "early life", "career", "married", "children", "his ", "her ",
    "politician", "leader", "ceo", "founder", "president ", "minister ",
  ];
  const personScore = personIndicators.filter(ind => lowerContent.includes(ind)).length;

  const orgIndicators = [
    "company", "corporation", "founded in", "headquarters", "inc.", "ltd.",
    "organization", "institution", "agency", "association", "foundation",
  ];
  const orgScore = orgIndicators.filter(ind => lowerContent.includes(ind)).length;

  const scores = [
    { type: "country" as EntityType, score: countryScore * 2 },
    { type: "group" as EntityType, score: groupScore * 1.5 },
    { type: "person" as EntityType, score: personScore },
    { type: "organization" as EntityType, score: orgScore },
  ];

  scores.sort((a, b) => b.score - a.score);
  return scores[0].score > 0 ? scores[0].type : "organization";
}

interface EntityOptions {
  accessToken?: string; // Ignored in local mode, kept for API compatibility
  llmSettings?: LLMSettings; // Custom LLM provider settings
}

/**
 * Research an entity using WebScrapper + LM Studio
 */
export async function getEntityResearch(entityName: string, options?: EntityOptions) {
  try {
    // First, gather information from multiple sources
    const [newsResults, socialResults] = await Promise.all([
      searchEvents(`${entityName} profile background`, { maxResults: 10 }),
      searchSocialMedia("reddit", entityName, 20),
    ]);

    const combinedContent = [
      ...newsResults.results.map(r => r.content),
      ...socialResults.map(p => p.text || ""),
    ].join("\n\n");

    if (!combinedContent) {
      return null;
    }

    const entityType = classifyEntityType(entityName, combinedContent);

    // Get date context for accurate temporal analysis
    const { dateString, year, context: dateContext } = getDateContext();

    // Use LM Studio to generate a summary
    const systemPrompt = `You are an intelligence analyst. Provide concise, factual summaries. ${dateContext}`;
    const prompt = `Today is ${dateString}. Based on the following recent information from ${year}, provide a brief intelligence profile of "${entityName}":\n\n${combinedContent.slice(0, 4000)}`;

    const summary = await generateLLMResponse(prompt, systemPrompt, {
      temperature: 0.3,
      maxTokens: 1000,
      llmSettings: options?.llmSettings,
    });

    return {
      name: entityName,
      description: summary || combinedContent.slice(0, 1000),
      type: entityType,
      data: {
        sources: newsResults.results.map(r => ({
          title: r.title,
          url: r.url,
        })),
      },
    };
  } catch (error) {
    console.error("Entity research error:", error);
    return null;
  }
}

interface EntityStreamChunk {
  type: "content" | "sources" | "done" | "error";
  content?: string;
  sources?: Array<{ title: string; url: string }>;
  error?: string;
}

/**
 * Stream entity research using WebScrapper + LM Studio
 */
export async function* streamEntityResearch(
  entityName: string,
  options?: EntityOptions
): AsyncGenerator<EntityStreamChunk> {
  try {
    // Gather sources first
    const newsResults = await searchEvents(`${entityName} profile background`, { maxResults: 10 });

    if (newsResults.results.length > 0) {
      yield {
        type: "sources",
        sources: newsResults.results.map(r => ({
          title: r.title,
          url: r.url,
        })),
      };
    }

    const combinedContent = newsResults.results.map(r => r.content).join("\n\n");

    // Get date context for accurate temporal analysis
    const { dateString, year, context: dateContext } = getDateContext();

    const systemPrompt = `You are an intelligence analyst. Provide comprehensive, factual profiles. ${dateContext}`;
    const prompt = `Today is ${dateString}. Provide a comprehensive overview of ${entityName}. Include:
- What/who they are and their background
- Key facts, history, and significance
- Notable activities, operations, or achievements
- Current status and recent developments in ${year}
- Geographic presence and areas of operation

Based on this recent information:
${combinedContent.slice(0, 4000)}`;

    // Stream the LLM response
    let fullContent = "";
    for await (const chunk of streamLLMResponse(prompt, systemPrompt, {
      llmSettings: options?.llmSettings,
    })) {
      fullContent += chunk;
      yield { type: "content", content: chunk };
    }

    yield { type: "done" };
  } catch (error) {
    yield {
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Search for entity locations
 */
export async function searchEntityLocations(entityName: string, options?: EntityOptions): Promise<string> {
  try {
    const results = await searchEvents(
      `${entityName} headquarters offices locations operations`,
      { maxResults: 15 }
    );

    return results.results.map(r => r.content).join("\n\n");
  } catch (error) {
    console.error("Entity locations error:", error);
    return "";
  }
}

// ============================================================================
// COUNTRY CONFLICTS - Replaces valyu conflict functions
// ============================================================================

interface ConflictResult {
  answer: string;
  sources: { title: string; url: string }[];
}

/**
 * Get country conflict information using WebScrapper + LM Studio
 * Uses strictCountry to ensure only news from the specified country is returned
 */
export async function getCountryConflicts(
  country: string,
  options?: EntityOptions
): Promise<{ past: ConflictResult; current: ConflictResult }> {
  try {
    // Get dynamic year for search queries
    const currentYear = new Date().getFullYear();

    // Get country-specific keywords in native language + English
    // This ensures we match local news articles in their native language
    const countryKW = getCountryKeywords(country);

    // Use country-specific keywords - these include native language terms from agents.yaml
    const securityKeywords = countryKW.security;
    const politicalKeywords = countryKW.political;
    const economicKeywords = countryKW.economic;
    const historicalKeywords = "war,conflict,battle,invasion,occupation,independence,treaty,WWII,Soviet,historical";

    // Search for conflict, political, and economic news - use strictCountry to filter to this country only
    console.log(`[getCountryConflicts] Starting search for ${country} with LOCAL keywords:`, {
      security: securityKeywords.substring(0, 80) + '...',
      political: politicalKeywords.substring(0, 80) + '...',
      economic: economicKeywords.substring(0, 60) + '...',
    });

    const [currentNews, historicalNews, politicalNews, economicNews] = await Promise.all([
      searchEvents(securityKeywords, {
        maxResults: 15,
        strictCountry: country,
      }),
      searchEvents(historicalKeywords, {
        maxResults: 15,
        strictCountry: country,
      }),
      // Political developments
      searchEvents(politicalKeywords, {
        maxResults: 10,
        strictCountry: country,
      }),
      // Economic developments
      searchEvents(economicKeywords, {
        maxResults: 10,
        strictCountry: country,
      }),
    ]);

    // Debug logging
    console.log(`[getCountryConflicts] Results for ${country}:`, {
      security: currentNews.results.length,
      historical: historicalNews.results.length,
      political: politicalNews.results.length,
      economic: economicNews.results.length,
    });

    if (currentNews.results.length > 0) {
      console.log(`[getCountryConflicts] Sample security titles:`, currentNews.results.slice(0, 3).map(r => r.title));
    }
    if (politicalNews.results.length > 0) {
      console.log(`[getCountryConflicts] Sample political titles:`, politicalNews.results.slice(0, 3).map(r => r.title));
    }

    const currentContent = currentNews.results.map(r => `${r.title}: ${r.content}`).join("\n\n");
    const historicalContent = historicalNews.results.map(r => `${r.title}: ${r.content}`).join("\n\n");
    const politicalContent = politicalNews.results.map(r => `${r.title}: ${r.content}`).join("\n\n");
    const economicContent = economicNews.results.map(r => `${r.title}: ${r.content}`).join("\n\n");

    // Check if we have any relevant content
    const totalArticles = currentNews.results.length + politicalNews.results.length + economicNews.results.length;
    console.log(`[getCountryConflicts] Content lengths:`, {
      security: currentContent.length,
      historical: historicalContent.length,
      political: politicalContent.length,
      economic: economicContent.length,
      totalArticles,
    });
    const hasContent = totalArticles > 0 && (currentContent.length > 100 || politicalContent.length > 100 || economicContent.length > 100);

    // Get date context for accurate temporal analysis
    const { dateString, year, context: dateContext } = getDateContext();

    const systemPrompt = `You are a geopolitical analyst specializing in conflict, political, and economic analysis. ${dateContext}

CRITICAL INSTRUCTION: You must ONLY analyze information that is explicitly provided in the news sources below.
- Do NOT fabricate, invent, or hallucinate any events, dates, names, or facts.
- Do NOT mix in information from your training data that is not supported by the provided sources.
- If a section has no relevant information in the sources, explicitly state "No current information available from sources."
- If the sources contain irrelevant content (weather, sports, entertainment), ignore it and state what IS relevant or that no relevant information was found.`;

    // Generate current analysis covering conflicts, politics, and economics
    const currentPrompt = hasContent
      ? `Today is ${dateString}. Based ONLY on the following recent news from ${year}, analyze the current situation in ${country}:

1. CONFLICTS & MILITARY: Current conflicts, military tensions, security threats, border disputes, civil unrest
2. POLITICAL DEVELOPMENTS: Government changes, elections, leadership actions, foreign policy, diplomatic incidents
3. ECONOMIC ACTIONS: Trade policies, sanctions, central bank decisions, economic tensions, major economic events

IMPORTANT: Only use information from the sources below. If a category has no relevant news, say "No current information available."

SECURITY & CONFLICT NEWS (${currentNews.results.length} articles):
${currentContent.slice(0, 3000) || "No security news available."}

POLITICAL NEWS (${politicalNews.results.length} articles):
${politicalContent.slice(0, 1500) || "No political news available."}

ECONOMIC NEWS (${economicNews.results.length} articles):
${economicContent.slice(0, 1500) || "No economic news available."}`
      : `Today is ${dateString}. I was unable to find current news articles about ${country} from local sources. Please respond with: "No current news available from local sources for ${country}. Unable to provide current situation analysis."`;

    // Generate historical conflicts analysis
    const pastPrompt = historicalContent.length > 100
      ? `Based ONLY on the following information, list major historical wars, conflicts, and military engagements that ${country} has been involved in. Include dates, opposing parties, and outcomes ONLY if mentioned in the sources.

IMPORTANT: Only use information from sources below. Do not add historical events from your training data.

Sources:
${historicalContent.slice(0, 4000)}`
      : `No historical conflict information was found in the news sources for ${country}. Please respond with: "No historical conflict information available from current sources."`;

    const [currentAnswer, pastAnswer] = await Promise.all([
      generateLLMResponse(currentPrompt, systemPrompt, { temperature: 0.3, llmSettings: options?.llmSettings }),
      generateLLMResponse(pastPrompt, systemPrompt, { temperature: 0.3, llmSettings: options?.llmSettings }),
    ]);

    // Combine all current sources (conflict + political + economic)
    const allCurrentSources = [
      ...currentNews.results.map(r => ({ title: r.title, url: r.url })),
      ...politicalNews.results.map(r => ({ title: r.title, url: r.url })),
      ...economicNews.results.map(r => ({ title: r.title, url: r.url })),
    ];

    return {
      past: {
        answer: pastAnswer || "No historical conflict information found.",
        sources: historicalNews.results.map(r => ({ title: r.title, url: r.url })),
      },
      current: {
        answer: currentAnswer || "No current information found.",
        sources: allCurrentSources,
      },
    };
  } catch (error) {
    console.error("Country conflicts error:", error);
    return {
      past: { answer: "Error fetching historical conflicts.", sources: [] },
      current: { answer: "Error fetching current conflicts.", sources: [] },
    };
  }
}

export type ConflictStreamChunk = {
  type: "current_content" | "current_sources" | "past_content" | "past_sources" | "done" | "error";
  content?: string;
  sources?: Array<{
    title: string;
    url: string;
    source?: string;
    sourceCountry?: string;
  }>;
  error?: string;
};

/**
 * Stream country conflict information
 * Uses strictCountry to ensure only news from the specified country is returned
 */
export async function* streamCountryConflicts(
  country: string,
  options?: EntityOptions
): AsyncGenerator<ConflictStreamChunk> {
  try {
    // Get dynamic year for search queries
    const currentYear = new Date().getFullYear();

    // Get country-specific keywords in native language + English
    const countryKW = getCountryKeywords(country);
    const securityKeywords = countryKW.security;
    const politicalKeywords = countryKW.political;
    const economicKeywords = countryKW.economic;

    console.log(`[streamCountryConflicts] Using LOCAL keywords for ${country}:`, {
      security: securityKeywords.substring(0, 60) + '...',
    });

    // Get conflict, political, and economic news in parallel
    const [currentNews, politicalNews, economicNews] = await Promise.all([
      searchEvents(securityKeywords, {
        maxResults: 15,
        strictCountry: country,
      }),
      searchEvents(politicalKeywords, {
        maxResults: 10,
        strictCountry: country,
      }),
      searchEvents(economicKeywords, {
        maxResults: 10,
        strictCountry: country,
      }),
    ]);

    // Combine all current sources
    const allCurrentSources = [
      ...currentNews.results.map(r => ({
        title: r.title,
        url: r.url,
        source: r.source,
        sourceCountry: r.sourceCountry,
      })),
      ...politicalNews.results.map(r => ({
        title: r.title,
        url: r.url,
        source: r.source,
        sourceCountry: r.sourceCountry,
      })),
      ...economicNews.results.map(r => ({
        title: r.title,
        url: r.url,
        source: r.source,
        sourceCountry: r.sourceCountry,
      })),
    ];

    yield {
      type: "current_sources",
      sources: allCurrentSources,
    };

    const currentContent = currentNews.results.map(r => `${r.title}: ${r.content}`).join("\n\n");
    const politicalContent = politicalNews.results.map(r => `${r.title}: ${r.content}`).join("\n\n");
    const economicContent = economicNews.results.map(r => `${r.title}: ${r.content}`).join("\n\n");

    // Check if we have any relevant content
    const totalArticles = currentNews.results.length + politicalNews.results.length + economicNews.results.length;
    const hasContent = totalArticles > 0 && (currentContent.length > 100 || politicalContent.length > 100 || economicContent.length > 100);

    // Get date context for accurate temporal analysis
    const { dateString, year, context: dateContext } = getDateContext();

    const systemPrompt = `You are a geopolitical analyst specializing in conflict, political, and economic analysis. ${dateContext}

CRITICAL: Only analyze information from the provided news sources. Do NOT fabricate events or use training data not in the sources. If no relevant information exists, say "No information available."`;

    const currentPrompt = hasContent
      ? `Today is ${dateString}. Based ONLY on these news sources, analyze ${country}'s current situation in ${year}:

1. CONFLICTS & MILITARY: Current conflicts, military tensions, security threats
2. POLITICAL DEVELOPMENTS: Government changes, elections, leadership actions, foreign policy
3. ECONOMIC ACTIONS: Trade policies, sanctions, central bank decisions

IMPORTANT: Only cite information from sources below. Say "No information available" for categories without relevant news.

SECURITY NEWS (${currentNews.results.length} articles):
${currentContent.slice(0, 2500) || "No security news."}

POLITICAL NEWS (${politicalNews.results.length} articles):
${politicalContent.slice(0, 1200) || "No political news."}

ECONOMIC NEWS (${economicNews.results.length} articles):
${economicContent.slice(0, 1200) || "No economic news."}`
      : `No current news articles found for ${country}. Please respond: "No current news available from local sources for ${country}."`;

    for await (const chunk of streamLLMResponse(currentPrompt, systemPrompt, {
      llmSettings: options?.llmSettings,
    })) {
      yield { type: "current_content", content: chunk };
    }

    // Get past conflicts - use broader historical keywords
    const historicalKeywords = "war,conflict,battle,invasion,occupation,independence,treaty,WWII,Soviet";
    const historicalNews = await searchEvents(historicalKeywords, {
      maxResults: 15,
      strictCountry: country,
    });

    yield {
      type: "past_sources",
      sources: historicalNews.results.map(r => ({
        title: r.title,
        url: r.url,
        source: r.source,
        sourceCountry: r.sourceCountry,
      })),
    };

    const historicalContent = historicalNews.results.map(r => `${r.title}: ${r.content}`).join("\n\n");

    const pastPrompt = historicalContent.length > 100
      ? `Based ONLY on these sources, list historical wars and conflicts involving ${country} (pre-${year}). Only cite what's in the sources:
${historicalContent.slice(0, 4000)}`
      : `No historical information found. Please respond: "No historical conflict information available from current sources."`;

    for await (const chunk of streamLLMResponse(pastPrompt, systemPrompt, {
      llmSettings: options?.llmSettings,
    })) {
      yield { type: "past_content", content: chunk };
    }

    yield { type: "done" };
  } catch (error) {
    yield {
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// ============================================================================
// NEWS SUMMARY - AI-generated summaries for country news
// ============================================================================

export interface NewsSummaryChunk {
  type: "general_content" | "politics_content" | "business_content" | "sources" | "done" | "error";
  content?: string;
  sources?: { title: string; url: string; source?: string }[];
  error?: string;
}

/**
 * Stream AI-generated news summaries for a country
 * Generates summaries for: General News, Politics, Business/Economy
 */
export async function* streamNewsSummary(
  country: string,
  options?: EntityOptions
): AsyncGenerator<NewsSummaryChunk> {
  try {
    // Get country-specific keywords
    const countryKW = getCountryKeywords(country);

    console.log(`[streamNewsSummary] Generating news summaries for ${country}`);

    // Fetch news for each category in parallel
    const [generalNews, politicsNews, businessNews] = await Promise.all([
      searchEvents(`${country} news headlines today`, {
        maxResults: 12,
        strictCountry: country,
      }),
      searchEvents(countryKW.political, {
        maxResults: 10,
        strictCountry: country,
      }),
      searchEvents(countryKW.economic, {
        maxResults: 10,
        strictCountry: country,
      }),
    ]);

    // Combine all sources for reference
    const allSources = [
      ...generalNews.results.map(r => ({ title: r.title, url: r.url, source: r.source })),
      ...politicsNews.results.map(r => ({ title: r.title, url: r.url, source: r.source })),
      ...businessNews.results.map(r => ({ title: r.title, url: r.url, source: r.source })),
    ];

    // Remove duplicates by URL
    const uniqueSources = allSources.filter((source, index, self) =>
      index === self.findIndex(s => s.url === source.url)
    );

    yield { type: "sources", sources: uniqueSources };

    // Get date context
    const { dateString, year } = getDateContext();

    const systemPrompt = `You are a news analyst providing concise, factual summaries. Today is ${dateString}.
CRITICAL: Only summarize information from the provided news sources. Do NOT fabricate or hallucinate any facts, events, names, or details.
If no relevant news is available, say "No recent news available."
Keep summaries brief (2-3 sentences per topic) and factual.`;

    // Generate general news summary
    const generalContent = generalNews.results.map(r => `${r.title}: ${r.content}`).join("\n");
    if (generalContent.length > 50) {
      const generalPrompt = `Summarize the main news headlines for ${country} today (${dateString}). Focus on the most significant stories. Keep it to 2-3 sentences.

NEWS HEADLINES:
${generalContent.slice(0, 2000)}`;

      for await (const chunk of streamLLMResponse(generalPrompt, systemPrompt, {
        llmSettings: options?.llmSettings,
      })) {
        yield { type: "general_content", content: chunk };
      }
    } else {
      yield { type: "general_content", content: `No recent general news available for ${country}.` };
    }

    // Generate politics summary
    const politicsContent = politicsNews.results.map(r => `${r.title}: ${r.content}`).join("\n");
    if (politicsContent.length > 50) {
      const politicsPrompt = `Summarize the key political developments in ${country} (${year}). Focus on government actions, elections, policy changes, or diplomatic news. Keep it to 2-3 sentences.

POLITICAL NEWS:
${politicsContent.slice(0, 2000)}`;

      for await (const chunk of streamLLMResponse(politicsPrompt, systemPrompt, {
        llmSettings: options?.llmSettings,
      })) {
        yield { type: "politics_content", content: chunk };
      }
    } else {
      yield { type: "politics_content", content: `No recent political news available for ${country}.` };
    }

    // Generate business/economy summary
    const businessContent = businessNews.results.map(r => `${r.title}: ${r.content}`).join("\n");
    if (businessContent.length > 50) {
      const businessPrompt = `Summarize the key business and economic news for ${country} (${year}). Focus on market developments, economic indicators, trade, or major corporate news. Keep it to 2-3 sentences.

BUSINESS/ECONOMIC NEWS:
${businessContent.slice(0, 2000)}`;

      for await (const chunk of streamLLMResponse(businessPrompt, systemPrompt, {
        llmSettings: options?.llmSettings,
      })) {
        yield { type: "business_content", content: chunk };
      }
    } else {
      yield { type: "business_content", content: `No recent business news available for ${country}.` };
    }

    yield { type: "done" };
  } catch (error) {
    yield {
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// ============================================================================
// DEEP RESEARCH - Replaces valyu.deepResearch()
// ============================================================================

export interface DeepResearchResult {
  summary: string;
  sources: { title: string; url: string }[];
  deliverables?: {
    csv?: { url: string; title: string };
    pptx?: { url: string; title: string };
  };
  pdfUrl?: string;
}

/**
 * Perform deep research using WebScrapper + LM Studio
 * This is a simplified version - for full functionality, use Eagle Journalist
 */
export async function deepResearch(topic: string, options?: EntityOptions): Promise<DeepResearchResult> {
  try {
    // Gather comprehensive information from multiple sources
    const [newsResults, redditResults, blueskyResults] = await Promise.all([
      searchEvents(`${topic} comprehensive analysis`, { maxResults: 30 }),
      searchSocialMedia("reddit", topic, 30),
      searchSocialMedia("bluesky", topic, 30),
    ]);

    const allContent = [
      ...newsResults.results.map(r => `[News] ${r.title}: ${r.content}`),
      ...redditResults.map(p => `[Reddit] ${p.title || ""}: ${p.text || ""}`),
      ...blueskyResults.map(p => `[Bluesky] ${p.text || ""}`),
    ].join("\n\n");

    // Get date context for accurate temporal analysis
    const { dateString, year, context: dateContext } = getDateContext();

    const systemPrompt = `You are an intelligence analyst creating a comprehensive dossier. ${dateContext}
Provide structured analysis with clear sections and factual information.`;

    const prompt = `Today is ${dateString}. Create an intelligence dossier on "${topic}". Include:
- Background and overview
- Key locations and geographic presence
- Organizational structure and leadership (if applicable)
- Related entities, allies, and adversaries
- Recent activities and incidents (focusing on ${year})
- Threat assessment and capabilities
- Timeline of significant events

Based on this information:
${allContent.slice(0, 8000)}`;

    const summary = await generateLLMResponse(prompt, systemPrompt, {
      temperature: 0.3,
      maxTokens: 4000,
      timeout: 300000, // 5 minutes for comprehensive analysis
      llmSettings: options?.llmSettings,
    });

    return {
      summary: summary || "Research could not be completed.",
      sources: newsResults.results.map(r => ({
        title: r.title,
        url: r.url,
      })),
    };
  } catch (error) {
    console.error("Deep research error:", error);
    return {
      summary: "Research failed. Please try again.",
      sources: [],
    };
  }
}

// ============================================================================
// RAG SERVICE INTEGRATION
// ============================================================================

/**
 * Vector search using RAG service
 */
export async function vectorSearch(
  query: string,
  topK: number = 10
): Promise<any[]> {
  try {
    const response = await fetch(`${RAG_SERVICE_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, top_k: topK }),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("RAG search error:", error);
    return [];
  }
}

// ============================================================================
// MILITARY BASES (unchanged - no external API needed)
// ============================================================================

export interface MilitaryBase {
  country: string;
  baseName: string;
  latitude: number;
  longitude: number;
  type: "usa" | "nato";
}

/**
 * Comprehensive hardcoded list of US and NATO military bases worldwide
 * with precise city-level coordinates sourced from extensive research
 */
export function getMilitaryBases(): MilitaryBase[] {
  return [
    // ===== GERMANY (Major US presence) =====
    { country: "Germany", baseName: "Ramstein Air Base", latitude: 49.4369, longitude: 7.6003, type: "usa" },
    { country: "Germany", baseName: "Spangdahlem Air Base", latitude: 49.9725, longitude: 6.6925, type: "usa" },
    { country: "Germany", baseName: "Grafenwöhr Training Area", latitude: 49.6981, longitude: 11.9314, type: "usa" },
    { country: "Germany", baseName: "Stuttgart-Kelley Barracks", latitude: 48.7256, longitude: 9.1450, type: "usa" },
    { country: "Germany", baseName: "Landstuhl Regional Medical Center", latitude: 49.4033, longitude: 7.5569, type: "usa" },
    { country: "Germany", baseName: "Wiesbaden Army Airfield", latitude: 50.0500, longitude: 8.3253, type: "usa" },
    { country: "Germany", baseName: "Ansbach-Katterbach Kaserne", latitude: 49.2853, longitude: 10.5731, type: "usa" },
    { country: "Germany", baseName: "Vilseck-Rose Barracks", latitude: 49.6139, longitude: 11.8028, type: "usa" },
    { country: "Germany", baseName: "Baumholder", latitude: 49.6500, longitude: 7.3333, type: "usa" },

    // ===== JAPAN (Major US Pacific presence) =====
    { country: "Japan", baseName: "Kadena Air Base", latitude: 26.3516, longitude: 127.7692, type: "usa" },
    { country: "Japan", baseName: "MCAS Futenma", latitude: 26.2742, longitude: 127.7544, type: "usa" },
    { country: "Japan", baseName: "Yokota Air Base", latitude: 35.7485, longitude: 139.3487, type: "usa" },
    { country: "Japan", baseName: "Misawa Air Base", latitude: 40.7033, longitude: 141.3686, type: "usa" },
    { country: "Japan", baseName: "Camp Zama", latitude: 35.4778, longitude: 139.3944, type: "usa" },
    { country: "Japan", baseName: "Yokosuka Naval Base", latitude: 35.2878, longitude: 139.6500, type: "usa" },
    { country: "Japan", baseName: "Sasebo Naval Base", latitude: 33.1528, longitude: 129.7175, type: "usa" },
    { country: "Japan", baseName: "Camp Hansen", latitude: 26.4686, longitude: 127.8833, type: "usa" },
    { country: "Japan", baseName: "Camp Schwab", latitude: 26.5306, longitude: 128.0500, type: "usa" },
    { country: "Japan", baseName: "MCAS Iwakuni", latitude: 34.1444, longitude: 132.2358, type: "usa" },
    { country: "Japan", baseName: "White Beach Naval Facility", latitude: 26.2994, longitude: 127.8975, type: "usa" },
    { country: "Japan", baseName: "Torii Station", latitude: 26.3167, longitude: 127.7333, type: "usa" },

    // ===== SOUTH KOREA =====
    { country: "South Korea", baseName: "Camp Humphreys", latitude: 36.9631, longitude: 127.0311, type: "usa" },
    { country: "South Korea", baseName: "Osan Air Base", latitude: 37.0906, longitude: 127.0303, type: "usa" },
    { country: "South Korea", baseName: "Kunsan Air Base", latitude: 35.9039, longitude: 126.6158, type: "usa" },
    { country: "South Korea", baseName: "Camp Casey", latitude: 37.9178, longitude: 127.0542, type: "usa" },
    { country: "South Korea", baseName: "Camp Walker-Daegu", latitude: 35.8594, longitude: 128.5972, type: "usa" },
    { country: "South Korea", baseName: "Chinhae Naval Base", latitude: 35.1400, longitude: 128.6500, type: "usa" },

    // ===== ITALY =====
    { country: "Italy", baseName: "Aviano Air Base", latitude: 46.0319, longitude: 12.5965, type: "usa" },
    { country: "Italy", baseName: "NAS Sigonella", latitude: 37.4017, longitude: 14.9222, type: "usa" },
    { country: "Italy", baseName: "NSA Naples-Capodichino", latitude: 40.8831, longitude: 14.2908, type: "usa" },
    { country: "Italy", baseName: "Camp Ederle-Vicenza", latitude: 45.5156, longitude: 11.5517, type: "usa" },
    { country: "Italy", baseName: "NSA Gaeta", latitude: 41.2164, longitude: 13.5722, type: "usa" },
    { country: "Italy", baseName: "Camp Darby", latitude: 43.6333, longitude: 10.3500, type: "usa" },
    { country: "Italy", baseName: "NAS Capodichino", latitude: 40.8831, longitude: 14.2908, type: "nato" },

    // ===== UNITED KINGDOM =====
    { country: "United Kingdom", baseName: "RAF Lakenheath", latitude: 52.4093, longitude: 0.5610, type: "usa" },
    { country: "United Kingdom", baseName: "RAF Mildenhall", latitude: 52.3617, longitude: 0.4864, type: "usa" },
    { country: "United Kingdom", baseName: "RAF Fairford", latitude: 51.6828, longitude: -1.7900, type: "usa" },
    { country: "United Kingdom", baseName: "RAF Croughton", latitude: 51.9969, longitude: -1.2050, type: "usa" },
    { country: "United Kingdom", baseName: "RAF Alconbury", latitude: 52.3722, longitude: -0.2319, type: "usa" },
    { country: "United Kingdom", baseName: "RAF Menwith Hill", latitude: 54.0064, longitude: -1.6883, type: "usa" },
    { country: "United Kingdom", baseName: "RAF Welford", latitude: 51.4833, longitude: -1.3500, type: "usa" },

    // ===== SPAIN =====
    { country: "Spain", baseName: "Naval Station Rota", latitude: 36.6453, longitude: -6.3497, type: "usa" },
    { country: "Spain", baseName: "Morón Air Base", latitude: 37.1747, longitude: -5.6158, type: "usa" },

    // ===== TURKEY =====
    { country: "Turkey", baseName: "Incirlik Air Base", latitude: 37.0017, longitude: 35.4259, type: "usa" },
    { country: "Turkey", baseName: "Izmir Air Station", latitude: 38.4192, longitude: 27.1578, type: "nato" },
    { country: "Turkey", baseName: "Kürecik Radar Station", latitude: 37.8083, longitude: 37.5500, type: "nato" },

    // ===== MIDDLE EAST - QATAR =====
    { country: "Qatar", baseName: "Al Udeid Air Base", latitude: 25.1173, longitude: 51.3150, type: "usa" },
    { country: "Qatar", baseName: "Camp As Sayliyah", latitude: 25.3228, longitude: 51.4378, type: "usa" },

    // ===== MIDDLE EAST - KUWAIT =====
    { country: "Kuwait", baseName: "Camp Arifjan", latitude: 28.9347, longitude: 48.0917, type: "usa" },
    { country: "Kuwait", baseName: "Camp Buehring", latitude: 29.5500, longitude: 47.6833, type: "usa" },
    { country: "Kuwait", baseName: "Ahmad al-Jaber Air Base", latitude: 28.9336, longitude: 47.7908, type: "usa" },
    { country: "Kuwait", baseName: "Ali Al Salem Air Base", latitude: 29.3467, longitude: 47.5206, type: "usa" },

    // ===== MIDDLE EAST - UAE =====
    { country: "United Arab Emirates", baseName: "Al Dhafra Air Base", latitude: 24.2481, longitude: 54.5467, type: "usa" },
    { country: "United Arab Emirates", baseName: "Fujairah Naval Base", latitude: 25.1203, longitude: 56.3447, type: "usa" },

    // ===== MIDDLE EAST - BAHRAIN =====
    { country: "Bahrain", baseName: "NSA Bahrain", latitude: 26.2361, longitude: 50.6508, type: "usa" },
    { country: "Bahrain", baseName: "Isa Air Base", latitude: 25.9186, longitude: 50.5906, type: "usa" },

    // ===== MIDDLE EAST - SAUDI ARABIA =====
    { country: "Saudi Arabia", baseName: "Prince Sultan Air Base", latitude: 24.0625, longitude: 47.5803, type: "usa" },
    { country: "Saudi Arabia", baseName: "Eskan Village", latitude: 24.6958, longitude: 46.8192, type: "usa" },

    // ===== MIDDLE EAST - JORDAN =====
    { country: "Jordan", baseName: "Muwaffaq Salti Air Base", latitude: 32.3564, longitude: 36.7831, type: "usa" },

    // ===== MIDDLE EAST - IRAQ =====
    { country: "Iraq", baseName: "Al Asad Air Base", latitude: 33.7867, longitude: 42.4417, type: "usa" },
    { country: "Iraq", baseName: "Erbil Air Base", latitude: 36.2378, longitude: 43.9631, type: "usa" },
    { country: "Iraq", baseName: "Victory Base Complex", latitude: 33.2931, longitude: 44.2489, type: "usa" },

    // ===== AFRICA - DJIBOUTI =====
    { country: "Djibouti", baseName: "Camp Lemonnier", latitude: 11.5469, longitude: 43.1556, type: "usa" },
    { country: "Djibouti", baseName: "Chabelley Airfield", latitude: 11.5167, longitude: 43.0667, type: "usa" },

    // ===== AFRICA - WEST =====
    { country: "Niger", baseName: "Air Base 201-Agadez", latitude: 16.9667, longitude: 7.9833, type: "usa" },
    { country: "Niger", baseName: "Air Base 101-Niamey", latitude: 13.4817, longitude: 2.1833, type: "usa" },
    { country: "Ghana", baseName: "Accra Cooperative Security Location", latitude: 5.6052, longitude: -0.1668, type: "usa" },
    { country: "Senegal", baseName: "Dakar Cooperative Security Location", latitude: 14.7397, longitude: -17.4902, type: "usa" },
    { country: "Burkina Faso", baseName: "Ouagadougou Air Base", latitude: 12.3532, longitude: -1.5124, type: "usa" },
    { country: "Mali", baseName: "Bamako Senou Airport", latitude: 12.5335, longitude: -7.9499, type: "usa" },
    { country: "Cameroon", baseName: "Garoua Air Base", latitude: 9.3358, longitude: 13.3701, type: "usa" },
    { country: "Gabon", baseName: "Libreville Air Base", latitude: 0.4586, longitude: 9.4123, type: "usa" },
    { country: "Ivory Coast", baseName: "Abidjan Port Bouet", latitude: 5.2564, longitude: -3.9262, type: "usa" },

    // ===== AFRICA - EAST =====
    { country: "Kenya", baseName: "Camp Simba-Manda Bay", latitude: -2.2500, longitude: 40.9500, type: "usa" },
    { country: "Kenya", baseName: "Mombasa Port", latitude: -4.0435, longitude: 39.6682, type: "usa" },
    { country: "Somalia", baseName: "Baledogle Airfield", latitude: 2.7614, longitude: 45.2036, type: "usa" },
    { country: "Somalia", baseName: "Mogadishu Airport", latitude: 2.0144, longitude: 45.3047, type: "usa" },
    { country: "Uganda", baseName: "Entebbe Air Base", latitude: 0.0424, longitude: 32.4436, type: "usa" },
    { country: "Ethiopia", baseName: "Arba Minch Airport", latitude: 6.0394, longitude: 37.5905, type: "usa" },
    { country: "Ethiopia", baseName: "Camp Gilbert-Dire Dawa", latitude: 9.6047, longitude: 41.8544, type: "usa" },
    { country: "Eritrea", baseName: "Asmara", latitude: 15.2910, longitude: 38.9108, type: "usa" },
    { country: "South Sudan", baseName: "Juba Cooperative Security Location", latitude: 4.8722, longitude: 31.6011, type: "usa" },
    { country: "Rwanda", baseName: "Kigali Airport", latitude: -1.9686, longitude: 30.1395, type: "usa" },

    // ===== AFRICA - NORTH =====
    { country: "Egypt", baseName: "Cairo West Air Base", latitude: 30.1164, longitude: 30.9153, type: "usa" },
    { country: "Egypt", baseName: "Borg El Arab Airport", latitude: 30.9177, longitude: 29.6964, type: "usa" },
    { country: "Tunisia", baseName: "Sidi Ahmed Air Base", latitude: 37.2453, longitude: 9.7944, type: "usa" },
    { country: "Morocco", baseName: "Tan-Tan Air Base", latitude: 28.4482, longitude: -11.1613, type: "usa" },
    { country: "Libya", baseName: "Misrata Air Base", latitude: 32.3250, longitude: 15.0611, type: "usa" },

    // ===== AFRICA - CENTRAL =====
    { country: "Chad", baseName: "N'Djamena Air Base", latitude: 12.1337, longitude: 15.0340, type: "usa" },
    { country: "Central African Republic", baseName: "Bangui M'Poko Airport", latitude: 4.3985, longitude: 18.5188, type: "usa" },
    { country: "Democratic Republic of Congo", baseName: "Kinshasa N'djili Airport", latitude: -4.3858, longitude: 15.4446, type: "usa" },

    // ===== AFRICA - SOUTHERN =====
    { country: "Botswana", baseName: "Thebephatshwa Air Base", latitude: -24.1557, longitude: 25.2617, type: "usa" },
    { country: "South Africa", baseName: "Pretoria Cooperative Security Location", latitude: -25.7479, longitude: 28.1879, type: "usa" },

    // ===== UNITED STATES - ARMY =====
    { country: "United States", baseName: "Fort Liberty (Bragg)", latitude: 35.1400, longitude: -79.0064, type: "usa" },
    { country: "United States", baseName: "Fort Cavazos (Hood)", latitude: 31.1350, longitude: -97.7764, type: "usa" },
    { country: "United States", baseName: "Fort Campbell", latitude: 36.6678, longitude: -87.4747, type: "usa" },
    { country: "United States", baseName: "Fort Moore (Benning)", latitude: 32.3597, longitude: -84.9483, type: "usa" },
    { country: "United States", baseName: "Fort Carson", latitude: 38.7378, longitude: -104.7892, type: "usa" },
    { country: "United States", baseName: "Fort Riley", latitude: 39.0553, longitude: -96.7892, type: "usa" },
    { country: "United States", baseName: "Fort Drum", latitude: 44.0417, longitude: -75.7194, type: "usa" },
    { country: "United States", baseName: "Fort Stewart", latitude: 31.8722, longitude: -81.6097, type: "usa" },
    { country: "United States", baseName: "JBLM-Fort Lewis", latitude: 47.0853, longitude: -122.5800, type: "usa" },
    { country: "United States", baseName: "Fort Bliss", latitude: 31.8133, longitude: -106.4117, type: "usa" },
    { country: "United States", baseName: "Fort Sill", latitude: 34.6500, longitude: -98.4000, type: "usa" },
    { country: "United States", baseName: "Fort Irwin", latitude: 35.2628, longitude: -116.6833, type: "usa" },
    { country: "United States", baseName: "Fort Polk", latitude: 31.0456, longitude: -93.2158, type: "usa" },
    { country: "United States", baseName: "Fort Wainwright", latitude: 64.8289, longitude: -147.6411, type: "usa" },
    { country: "United States", baseName: "Fort Greely", latitude: 63.8833, longitude: -145.7333, type: "usa" },

    // ===== UNITED STATES - NAVY =====
    { country: "United States", baseName: "Naval Station Norfolk", latitude: 36.9461, longitude: -76.3033, type: "usa" },
    { country: "United States", baseName: "Naval Base San Diego", latitude: 32.6833, longitude: -117.1167, type: "usa" },
    { country: "United States", baseName: "Pearl Harbor-Hickam", latitude: 21.3528, longitude: -157.9500, type: "usa" },
    { country: "United States", baseName: "Naval Station Mayport", latitude: 30.3906, longitude: -81.4086, type: "usa" },
    { country: "United States", baseName: "Naval Base Kitsap", latitude: 47.5650, longitude: -122.6533, type: "usa" },
    { country: "United States", baseName: "Naval Station Great Lakes", latitude: 42.3044, longitude: -87.8500, type: "usa" },
    { country: "United States", baseName: "Naval Base Coronado", latitude: 32.6917, longitude: -117.1683, type: "usa" },
    { country: "United States", baseName: "Naval Submarine Base New London", latitude: 41.3883, longitude: -72.0900, type: "usa" },
    { country: "United States", baseName: "Naval Air Station Pensacola", latitude: 30.3500, longitude: -87.3167, type: "usa" },
    { country: "United States", baseName: "Naval Air Station Jacksonville", latitude: 30.2358, longitude: -81.6806, type: "usa" },
    { country: "United States", baseName: "Naval Station Newport", latitude: 41.5167, longitude: -71.3167, type: "usa" },
    { country: "United States", baseName: "Kings Bay Naval Submarine Base", latitude: 30.7994, longitude: -81.5144, type: "usa" },

    // ===== UNITED STATES - AIR FORCE =====
    { country: "United States", baseName: "Nellis AFB", latitude: 36.2361, longitude: -115.0344, type: "usa" },
    { country: "United States", baseName: "Edwards AFB", latitude: 34.9054, longitude: -117.8839, type: "usa" },
    { country: "United States", baseName: "Eglin AFB", latitude: 30.4833, longitude: -86.5333, type: "usa" },
    { country: "United States", baseName: "MacDill AFB", latitude: 27.8489, longitude: -82.5214, type: "usa" },
    { country: "United States", baseName: "Langley AFB", latitude: 37.0833, longitude: -76.3606, type: "usa" },
    { country: "United States", baseName: "Luke AFB", latitude: 33.5350, longitude: -112.3833, type: "usa" },
    { country: "United States", baseName: "Travis AFB", latitude: 38.2628, longitude: -121.9275, type: "usa" },
    { country: "United States", baseName: "Tinker AFB", latitude: 35.4147, longitude: -97.3867, type: "usa" },
    { country: "United States", baseName: "Wright-Patterson AFB", latitude: 39.8261, longitude: -84.0483, type: "usa" },
    { country: "United States", baseName: "Offutt AFB", latitude: 41.1183, longitude: -95.9125, type: "usa" },
    { country: "United States", baseName: "Barksdale AFB", latitude: 32.5017, longitude: -93.6628, type: "usa" },
    { country: "United States", baseName: "Whiteman AFB", latitude: 38.7317, longitude: -93.5478, type: "usa" },
    { country: "United States", baseName: "Dyess AFB", latitude: 32.4208, longitude: -99.8547, type: "usa" },
    { country: "United States", baseName: "Minot AFB", latitude: 48.4156, longitude: -101.3581, type: "usa" },
    { country: "United States", baseName: "Malmstrom AFB", latitude: 47.5067, longitude: -111.1831, type: "usa" },
    { country: "United States", baseName: "FE Warren AFB", latitude: 41.1456, longitude: -104.8614, type: "usa" },
    { country: "United States", baseName: "Peterson SFB", latitude: 38.8233, longitude: -104.7006, type: "usa" },
    { country: "United States", baseName: "Schriever SFB", latitude: 38.8094, longitude: -104.5281, type: "usa" },
    { country: "United States", baseName: "Vandenberg SFB", latitude: 34.7333, longitude: -120.5667, type: "usa" },
    { country: "United States", baseName: "Creech AFB", latitude: 36.5822, longitude: -115.6711, type: "usa" },
    { country: "United States", baseName: "Holloman AFB", latitude: 32.8525, longitude: -106.1061, type: "usa" },
    { country: "United States", baseName: "Davis-Monthan AFB", latitude: 32.1667, longitude: -110.8833, type: "usa" },
    { country: "United States", baseName: "Cannon AFB", latitude: 34.3828, longitude: -103.3222, type: "usa" },
    { country: "United States", baseName: "Eielson AFB", latitude: 64.6636, longitude: -147.1028, type: "usa" },
    { country: "United States", baseName: "Elmendorf-Richardson", latitude: 61.2500, longitude: -149.8067, type: "usa" },
    { country: "United States", baseName: "McConnell AFB", latitude: 37.6167, longitude: -97.2667, type: "usa" },
    { country: "United States", baseName: "Scott AFB", latitude: 38.5417, longitude: -89.8506, type: "usa" },

    // ===== UNITED STATES - MARINE CORPS =====
    { country: "United States", baseName: "Camp Pendleton", latitude: 33.3833, longitude: -117.5667, type: "usa" },
    { country: "United States", baseName: "Camp Lejeune", latitude: 34.6500, longitude: -77.3500, type: "usa" },
    { country: "United States", baseName: "MCAGCC Twentynine Palms", latitude: 34.2367, longitude: -116.0567, type: "usa" },
    { country: "United States", baseName: "MCB Quantico", latitude: 38.5222, longitude: -77.3050, type: "usa" },
    { country: "United States", baseName: "MCAS Miramar", latitude: 32.8683, longitude: -117.1433, type: "usa" },
    { country: "United States", baseName: "MCAS Cherry Point", latitude: 34.9008, longitude: -76.8806, type: "usa" },
    { country: "United States", baseName: "MCAS Beaufort", latitude: 32.4778, longitude: -80.7194, type: "usa" },
    { country: "United States", baseName: "MCAS Yuma", latitude: 32.6564, longitude: -114.6061, type: "usa" },
    { country: "United States", baseName: "MCRD Parris Island", latitude: 32.3333, longitude: -80.6833, type: "usa" },
    { country: "United States", baseName: "MCRD San Diego", latitude: 32.7414, longitude: -117.1992, type: "usa" },
    { country: "United States", baseName: "MCB Hawaii Kaneohe Bay", latitude: 21.4439, longitude: -157.7500, type: "usa" },

    // ===== ASIA - ADDITIONAL =====
    { country: "Thailand", baseName: "U-Tapao Airfield", latitude: 12.6799, longitude: 101.0050, type: "usa" },
    { country: "Thailand", baseName: "Korat Airfield", latitude: 14.9369, longitude: 102.0847, type: "usa" },
    { country: "Thailand", baseName: "Sattahip Naval Base", latitude: 12.6833, longitude: 100.8833, type: "usa" },
    { country: "Indonesia", baseName: "Biak Air Base", latitude: -1.1900, longitude: 136.1078, type: "usa" },
    { country: "Malaysia", baseName: "RMAF Butterworth", latitude: 5.4658, longitude: 100.3906, type: "usa" },
    { country: "Vietnam", baseName: "Da Nang Port (access)", latitude: 16.0544, longitude: 108.2022, type: "usa" },
    { country: "Vietnam", baseName: "Cam Ranh Bay (access)", latitude: 11.9983, longitude: 109.2194, type: "usa" },
    { country: "India", baseName: "Diego Garcia (joint)", latitude: -7.3133, longitude: 72.4111, type: "usa" },
    { country: "Palau", baseName: "Palau Compact Infrastructure", latitude: 7.5000, longitude: 134.6243, type: "usa" },
    { country: "Micronesia", baseName: "Pohnpei Cooperative Security", latitude: 6.9631, longitude: 158.2089, type: "usa" },
    { country: "Marshall Islands", baseName: "Kwajalein Atoll", latitude: 9.3944, longitude: 167.4708, type: "usa" },
    { country: "Wake Island", baseName: "Wake Island Airfield", latitude: 19.2822, longitude: 166.6472, type: "usa" },
    { country: "Taiwan", baseName: "AIT Taipei (de facto)", latitude: 25.0330, longitude: 121.5654, type: "usa" },
    { country: "Brunei", baseName: "Muara Naval Base (training)", latitude: 5.0117, longitude: 115.0669, type: "usa" },
    { country: "Bangladesh", baseName: "Dhaka Cooperative Security", latitude: 23.8433, longitude: 90.4006, type: "usa" },
    { country: "Mongolia", baseName: "Five Hills Training Center", latitude: 47.9200, longitude: 106.9200, type: "usa" },

    // ===== PACIFIC - GUAM =====
    { country: "Guam", baseName: "Andersen Air Force Base", latitude: 13.5839, longitude: 144.9244, type: "usa" },
    { country: "Guam", baseName: "Naval Base Guam", latitude: 13.4443, longitude: 144.6528, type: "usa" },
    { country: "Guam", baseName: "Camp Blaz", latitude: 13.5122, longitude: 144.8697, type: "usa" },

    // ===== PACIFIC - DIEGO GARCIA =====
    { country: "Diego Garcia", baseName: "Naval Support Facility Diego Garcia", latitude: -7.3133, longitude: 72.4111, type: "usa" },

    // ===== PACIFIC - AUSTRALIA =====
    { country: "Australia", baseName: "Pine Gap", latitude: -23.7990, longitude: 133.7370, type: "usa" },
    { country: "Australia", baseName: "RAAF Darwin", latitude: -12.4147, longitude: 130.8769, type: "usa" },
    { country: "Australia", baseName: "HMAS Stirling", latitude: -32.2333, longitude: 115.6667, type: "usa" },
    { country: "Australia", baseName: "Robertson Barracks-Darwin", latitude: -12.4631, longitude: 130.8408, type: "usa" },
    { country: "Australia", baseName: "RAAF Tindal", latitude: -14.5214, longitude: 132.3781, type: "usa" },

    // ===== PACIFIC - PHILIPPINES =====
    { country: "Philippines", baseName: "Clark Air Base", latitude: 15.1858, longitude: 120.5600, type: "usa" },
    { country: "Philippines", baseName: "Subic Bay", latitude: 14.7944, longitude: 120.2778, type: "usa" },
    { country: "Philippines", baseName: "Basa Air Base", latitude: 14.9864, longitude: 120.4903, type: "usa" },
    { country: "Philippines", baseName: "Fort Magsaysay", latitude: 15.4694, longitude: 121.1667, type: "usa" },
    { country: "Philippines", baseName: "Antonio Bautista Air Base-Palawan", latitude: 9.7422, longitude: 118.7589, type: "usa" },
    { country: "Philippines", baseName: "Lumbia Air Base-Cagayan de Oro", latitude: 8.4150, longitude: 124.6119, type: "usa" },
    { country: "Philippines", baseName: "Benito Ebuen Air Base-Cebu", latitude: 10.3067, longitude: 123.9792, type: "usa" },
    { country: "Philippines", baseName: "Cesar Basa Air Base-Pampanga", latitude: 14.9864, longitude: 120.4903, type: "usa" },
    { country: "Philippines", baseName: "Lal-Lo Airport-Cagayan", latitude: 18.1208, longitude: 121.7422, type: "usa" },

    // ===== PACIFIC - SINGAPORE =====
    { country: "Singapore", baseName: "Sembawang Wharves", latitude: 1.4419, longitude: 103.8200, type: "usa" },
    { country: "Singapore", baseName: "Paya Lebar Air Base", latitude: 1.3603, longitude: 103.9097, type: "usa" },

    // ===== CENTRAL/SOUTH AMERICA =====
    { country: "Cuba", baseName: "Guantanamo Bay Naval Base", latitude: 19.9025, longitude: -75.0969, type: "usa" },
    { country: "Honduras", baseName: "Soto Cano Air Base", latitude: 14.3822, longitude: -87.6211, type: "usa" },
    { country: "El Salvador", baseName: "Comalapa Air Base", latitude: 13.4408, longitude: -89.0572, type: "usa" },

    // ===== ARCTIC =====
    { country: "Greenland", baseName: "Thule Air Base", latitude: 76.5312, longitude: -68.7031, type: "usa" },
    { country: "Iceland", baseName: "Keflavik Air Base", latitude: 63.9850, longitude: -22.6056, type: "nato" },

    // ===== NATO - POLAND =====
    { country: "Poland", baseName: "Redzikowo Aegis Ashore", latitude: 54.4791, longitude: 17.0975, type: "nato" },
    { country: "Poland", baseName: "Lask Air Base", latitude: 51.5511, longitude: 19.1792, type: "nato" },
    { country: "Poland", baseName: "Poznań-Krzesiny Air Base", latitude: 52.3314, longitude: 16.9664, type: "nato" },
    { country: "Poland", baseName: "Powidz Air Base", latitude: 52.3794, longitude: 17.8539, type: "nato" },
    { country: "Poland", baseName: "Camp Kosciuszko-Poznań", latitude: 52.4064, longitude: 16.9252, type: "usa" },

    // ===== NATO - ROMANIA =====
    { country: "Romania", baseName: "Mihail Kogălniceanu Air Base", latitude: 44.3622, longitude: 28.4883, type: "nato" },
    { country: "Romania", baseName: "Deveselu Aegis Ashore", latitude: 44.0787, longitude: 24.4134, type: "usa" },
    { country: "Romania", baseName: "Câmpia Turzii Air Base", latitude: 46.5028, longitude: 23.8861, type: "nato" },

    // ===== NATO - BULGARIA =====
    { country: "Bulgaria", baseName: "Novo Selo Training Area", latitude: 42.0167, longitude: 26.1333, type: "nato" },
    { country: "Bulgaria", baseName: "Graf Ignatievo Air Base", latitude: 42.2904, longitude: 24.7140, type: "nato" },
    { country: "Bulgaria", baseName: "Bezmer Air Base", latitude: 42.4547, longitude: 26.3522, type: "nato" },

    // ===== NATO - GREECE =====
    { country: "Greece", baseName: "Souda Bay Naval Base", latitude: 35.5317, longitude: 24.1217, type: "nato" },
    { country: "Greece", baseName: "Larissa Air Base", latitude: 39.6500, longitude: 22.4447, type: "nato" },
    { country: "Greece", baseName: "Araxos Air Base", latitude: 38.1508, longitude: 21.4239, type: "nato" },
    { country: "Greece", baseName: "Alexandroupolis Port", latitude: 40.8489, longitude: 25.8756, type: "nato" },

    // ===== NATO - BALTIC STATES =====
    { country: "Estonia", baseName: "Ämari Air Base", latitude: 59.2603, longitude: 24.2086, type: "nato" },
    { country: "Estonia", baseName: "Tapa Army Base", latitude: 59.2711, longitude: 25.9444, type: "nato" },
    { country: "Latvia", baseName: "Lielvārde Air Base", latitude: 56.7761, longitude: 24.8536, type: "nato" },
    { country: "Latvia", baseName: "Ādaži Military Base", latitude: 57.0750, longitude: 24.3167, type: "nato" },
    { country: "Lithuania", baseName: "Šiauliai Air Base", latitude: 55.8939, longitude: 23.3950, type: "nato" },
    { country: "Lithuania", baseName: "Rukla", latitude: 55.0653, longitude: 24.1992, type: "nato" },

    // ===== NATO - NORWAY =====
    { country: "Norway", baseName: "Rygge Air Station", latitude: 59.3783, longitude: 10.7850, type: "nato" },
    { country: "Norway", baseName: "Ørland Air Base", latitude: 63.6992, longitude: 9.6050, type: "nato" },
    { country: "Norway", baseName: "Evenes Air Station", latitude: 68.4914, longitude: 16.6781, type: "nato" },
    { country: "Norway", baseName: "Bardufoss Air Station", latitude: 69.0578, longitude: 18.5403, type: "nato" },
    { country: "Norway", baseName: "Sola Air Station", latitude: 58.8756, longitude: 5.6386, type: "nato" },

    // ===== NATO - FINLAND (new member) =====
    { country: "Finland", baseName: "Rovaniemi Air Base", latitude: 66.5639, longitude: 25.8306, type: "nato" },
    { country: "Finland", baseName: "Kuopio-Rissala Air Base", latitude: 63.0467, longitude: 27.7978, type: "nato" },

    // ===== NATO - SWEDEN (new member) =====
    { country: "Sweden", baseName: "Gotland", latitude: 57.4667, longitude: 18.4833, type: "nato" },
    { country: "Sweden", baseName: "Luleå-Kallax Air Base", latitude: 65.5436, longitude: 22.1219, type: "nato" },

    // ===== NATO HQ & COMMAND =====
    { country: "Belgium", baseName: "NATO HQ Brussels", latitude: 50.8770, longitude: 4.4260, type: "nato" },
    { country: "Belgium", baseName: "SHAPE Mons", latitude: 50.5030, longitude: 3.9310, type: "nato" },
    { country: "Belgium", baseName: "Kleine Brogel Air Base", latitude: 51.1683, longitude: 5.4700, type: "nato" },
    { country: "Netherlands", baseName: "JFC Brunssum", latitude: 50.9469, longitude: 5.9772, type: "nato" },
    { country: "Netherlands", baseName: "Volkel Air Base", latitude: 51.6564, longitude: 5.7078, type: "nato" },

    // ===== NATO - HUNGARY =====
    { country: "Hungary", baseName: "Pápa Air Base", latitude: 47.3636, longitude: 17.5008, type: "nato" },
    { country: "Hungary", baseName: "Taszár Air Base", latitude: 46.3933, longitude: 17.9175, type: "nato" },

    // ===== NATO - CZECH REPUBLIC =====
    { country: "Czech Republic", baseName: "Náměšť nad Oslavou Air Base", latitude: 49.1658, longitude: 16.1247, type: "nato" },

    // ===== NATO - SLOVAKIA =====
    { country: "Slovakia", baseName: "Sliač Air Base", latitude: 48.6380, longitude: 19.1340, type: "nato" },

    // ===== NATO - CROATIA =====
    { country: "Croatia", baseName: "Pleso Air Base-Zagreb", latitude: 45.7427, longitude: 16.0686, type: "nato" },

    // ===== NATO - PORTUGAL =====
    { country: "Portugal", baseName: "Lajes Field-Azores", latitude: 38.7617, longitude: -27.0908, type: "usa" },

    // ===== NATO - KOSOVO =====
    { country: "Kosovo", baseName: "Camp Bondsteel", latitude: 42.3600, longitude: 21.2500, type: "nato" },

    // ===== NATO - ALBANIA =====
    { country: "Albania", baseName: "Kuçova Air Base", latitude: 40.7719, longitude: 19.9017, type: "nato" },

    // ===== NATO - MONTENEGRO =====
    { country: "Montenegro", baseName: "Golubovci Air Base", latitude: 42.3594, longitude: 19.2519, type: "nato" },

    // ===== NATO - NORTH MACEDONIA =====
    { country: "North Macedonia", baseName: "Petrovec Airport", latitude: 41.9617, longitude: 21.6214, type: "nato" },

    // ===== NATO - DENMARK =====
    { country: "Denmark", baseName: "Thule Air Base", latitude: 76.5312, longitude: -68.7031, type: "usa" },
    { country: "Denmark", baseName: "Fighter Wing Skrydstrup", latitude: 55.2258, longitude: 9.2639, type: "nato" },

    // ===== NATO - CANADA =====
    { country: "Canada", baseName: "CFB Trenton", latitude: 44.1189, longitude: -77.5281, type: "nato" },
    { country: "Canada", baseName: "CFB Esquimalt", latitude: 48.4331, longitude: -123.4147, type: "nato" },
    { country: "Canada", baseName: "CFB Cold Lake", latitude: 54.4050, longitude: -110.2778, type: "nato" },
    { country: "Canada", baseName: "CFB Bagotville", latitude: 48.3311, longitude: -70.9969, type: "nato" },
  ];
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

interface ServiceStatus {
  webscrapper: boolean;
  llm: boolean;
  llmProvider?: string;
  llmModels?: string[];
  ragService: boolean;
}

/**
 * Check if local services are running
 * @param llmSettings - Optional LLM settings to check (uses defaults if not provided)
 */
export async function checkLocalServices(llmSettings?: LLMSettings): Promise<ServiceStatus> {
  const settings = llmSettings || DEFAULT_LLM_SETTINGS;

  const status: ServiceStatus = {
    webscrapper: false,
    llm: false,
    llmProvider: settings.provider,
    ragService: false,
  };

  // Check WebScrapper (uses /api/news endpoint since it doesn't have /health)
  try {
    const wsResponse = await fetch(`${WEBSCRAPPER_URL}/api/news?keyword=test&max=1`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    status.webscrapper = wsResponse.ok;
  } catch {
    status.webscrapper = false;
  }

  // Check LLM Provider
  try {
    const baseUrl = settings.serverUrl.replace(/\/$/, "");
    let modelsEndpoint: string;

    switch (settings.provider) {
      case "ollama":
        modelsEndpoint = `${baseUrl}/api/tags`;
        break;
      default:
        modelsEndpoint = `${baseUrl}/models`;
        break;
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (settings.provider === "openai" && settings.apiKey) {
      headers["Authorization"] = `Bearer ${settings.apiKey}`;
    }

    const llmResponse = await fetch(modelsEndpoint, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(5000),
    });

    if (llmResponse.ok) {
      status.llm = true;
      const data = await llmResponse.json();

      if (settings.provider === "ollama") {
        status.llmModels = (data.models || []).map((m: any) => m.name);
      } else {
        status.llmModels = (data.data || []).map((m: any) => m.id);
      }
    }
  } catch {
    status.llm = false;
  }

  // Check RAG Service
  try {
    const ragResponse = await fetch(`${RAG_SERVICE_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    status.ragService = ragResponse.ok;
  } catch {
    status.ragService = false;
  }

  return status;
}
