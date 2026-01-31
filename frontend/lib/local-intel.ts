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
      return {
        ...baseRequest,
        model: settings.model || "llama3.2",
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

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`LLM error: ${response.status}`);
    }

    const data = await response.json();
    return parseLLMResponse(settings, data);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("LLM request timed out");
    } else {
      console.error("LLM error:", error);
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
  "timor-leste", "togo", "tonga", "trinidad", "tunisia", "turkey", "turkmenistan",
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

// Re-export getMilitaryBases from valyu.ts since it's just static data
export { getMilitaryBases } from "./valyu";

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
