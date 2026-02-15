/**
 * Country News API
 * Fetches latest news articles for a specific country
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WEBSCRAPPER_URL = process.env.WEBSCRAPPER_URL || "http://localhost:3001";

// Map country names to region codes for local news search
const COUNTRY_TO_REGION: Record<string, string> = {
  // Eastern Europe
  "ukraine": "eastern_europe",
  "russia": "eastern_europe",
  "poland": "eastern_europe",
  "romania": "eastern_europe",
  "hungary": "eastern_europe",
  "czech republic": "eastern_europe",
  "slovakia": "eastern_europe",
  "bulgaria": "eastern_europe",
  "moldova": "eastern_europe",
  "belarus": "eastern_europe",

  // Western Europe
  "united kingdom": "western_europe",
  "france": "western_europe",
  "germany": "western_europe",
  "italy": "western_europe",
  "spain": "western_europe",
  "portugal": "western_europe",
  "netherlands": "western_europe",
  "belgium": "western_europe",
  "austria": "western_europe",
  "switzerland": "western_europe",
  "ireland": "western_europe",
  "sweden": "western_europe",
  "norway": "western_europe",
  "denmark": "western_europe",
  "finland": "western_europe",
  "greece": "western_europe",

  // Middle East
  "israel": "middle_east",
  "iran": "middle_east",
  "iraq": "middle_east",
  "syria": "middle_east",
  "lebanon": "middle_east",
  "jordan": "middle_east",
  "saudi arabia": "middle_east",
  "united arab emirates": "middle_east",
  "qatar": "middle_east",
  "kuwait": "middle_east",
  "bahrain": "middle_east",
  "oman": "middle_east",
  "yemen": "middle_east",
  "turkey": "middle_east",
  "egypt": "middle_east",

  // East Asia
  "china": "east_asia",
  "japan": "east_asia",
  "south korea": "east_asia",
  "north korea": "east_asia",
  "taiwan": "east_asia",
  "mongolia": "east_asia",

  // Southeast Asia
  "vietnam": "southeast_asia",
  "thailand": "southeast_asia",
  "philippines": "southeast_asia",
  "indonesia": "southeast_asia",
  "malaysia": "southeast_asia",
  "singapore": "southeast_asia",
  "myanmar": "southeast_asia",
  "cambodia": "southeast_asia",
  "laos": "southeast_asia",

  // South Asia
  "india": "south_asia",
  "pakistan": "south_asia",
  "bangladesh": "south_asia",
  "sri lanka": "south_asia",
  "nepal": "south_asia",
  "afghanistan": "south_asia",

  // Central Asia
  "kazakhstan": "central_asia",
  "uzbekistan": "central_asia",
  "turkmenistan": "central_asia",
  "tajikistan": "central_asia",
  "kyrgyzstan": "central_asia",

  // North America
  "united states": "north_america",
  "canada": "north_america",
  "mexico": "north_america",

  // South America
  "brazil": "south_america",
  "argentina": "south_america",
  "colombia": "south_america",
  "chile": "south_america",
  "peru": "south_america",
  "venezuela": "south_america",
  "ecuador": "south_america",
  "bolivia": "south_america",
  "uruguay": "south_america",
  "paraguay": "south_america",

  // Africa
  "south africa": "africa",
  "nigeria": "africa",
  "kenya": "africa",
  "ethiopia": "africa",
  "ghana": "africa",
  "tanzania": "africa",
  "uganda": "africa",
  "morocco": "africa",
  "algeria": "africa",
  "tunisia": "africa",
  "libya": "africa",
  "sudan": "africa",
  "democratic republic of the congo": "africa",

  // Oceania
  "australia": "oceania",
  "new zealand": "oceania",
};

// Normalize country names to WebScrapper API format
const COUNTRY_NAME_MAP: Record<string, string> = {
  "united states": "us",
  "united_states": "us",
  "america": "us",
  "usa": "us",
  "united kingdom": "uk",
  "united_kingdom": "uk",
  "britain": "uk",
  "great britain": "uk",
  "england": "uk",
  "south korea": "south_korea",
  "north korea": "north_korea",
  "saudi arabia": "saudi_arabia",
  "czech republic": "czech",
  "czechia": "czech",
  "united arab emirates": "uae",
  "south africa": "south_africa",
  "new zealand": "new_zealand",
  "north macedonia": "north_macedonia",
  "sri lanka": "sri_lanka",
  "dr congo": "dr_congo",
  "democratic republic of the congo": "dr_congo",
  "bosnia and herzegovina": "bosnia",
};

function normalizeCountryName(country: string): string {
  const lower = country.toLowerCase().trim();
  return COUNTRY_NAME_MAP[lower] || lower.replace(/\s+/g, "_");
}

interface NewsArticle {
  title: string;
  url: string;
  description: string;
  source: string;
  publishedAt: string;
  category?: string;
}

async function fetchGlobalNews(country: string, limit: number): Promise<NewsArticle[]> {
  try {
    const params = new URLSearchParams({
      keyword: country,
      lang: "en",
      max: String(limit),
    });

    const response = await fetch(`${WEBSCRAPPER_URL}/api/news?${params}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return [];

    const data = await response.json();
    return (data.articles || []).map((article: any) => ({
      title: article.title || "Untitled",
      url: article.url || "",
      description: article.description || "",
      source: article.source?.name || "News",
      publishedAt: article.publishedAt || new Date().toISOString(),
      category: detectCategory(article.title, article.description),
    }));
  } catch {
    return [];
  }
}

async function fetchLocalNews(country: string, limit: number): Promise<NewsArticle[]> {
  try {
    // Normalize country name to WebScrapper API format (e.g., "United States" → "us")
    const normalizedCountry = normalizeCountryName(country);

    const params = new URLSearchParams({
      region: normalizedCountry,
      limit: String(limit),
    });

    console.log(`[Country News] Fetching local sources for: ${normalizedCountry}`);

    const response = await fetch(`${WEBSCRAPPER_URL}/api/local-sources?${params}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.log(`[Country News] Local sources API returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log(`[Country News] Got ${data.articles?.length || 0} articles from ${data.sources?.length || 0} sources`);

    return (data.articles || []).map((article: any) => ({
      title: article.title || "Untitled",
      url: article.url || "",
      description: article.description || article.content || "",
      source: article.source?.name || "Local Source",
      publishedAt: article.publishedAt || article.pubDate || new Date().toISOString(),
      category: detectCategory(article.title, article.description || article.content),
    }));
  } catch (error) {
    console.error(`[Country News] Local sources error:`, error);
    return [];
  }
}

// Fetch from country-specific Google News RSS
async function fetchGoogleNewsLocal(country: string, limit: number): Promise<NewsArticle[]> {
  try {
    // Normalize country name to WebScrapper API format (e.g., "United States" → "us")
    const normalizedCountry = normalizeCountryName(country);

    const params = new URLSearchParams({
      region: normalizedCountry,
      limit: String(limit),
    });

    const response = await fetch(`${WEBSCRAPPER_URL}/api/google-news-local?${params}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return [];

    const data = await response.json();
    return (data.articles || []).map((article: any) => ({
      title: article.title || "Untitled",
      url: article.url || "",
      description: article.description || "",
      source: `Google News (${country})`,
      publishedAt: article.publishedAt || article.pubDate || new Date().toISOString(),
      category: detectCategory(article.title, article.description || ""),
    }));
  } catch {
    return [];
  }
}

function detectCategory(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();

  if (/politic|government|parliament|election|minister|president|vote|law|legislation/i.test(text)) {
    return "politics";
  }
  if (/economy|economic|market|stock|trade|business|gdp|inflation|currency|bank/i.test(text)) {
    return "economy";
  }
  if (/tech|technology|ai|artificial intelligence|software|digital|cyber|startup/i.test(text)) {
    return "technology";
  }
  if (/sport|football|soccer|basketball|tennis|olympics|championship|match|game/i.test(text)) {
    return "sports";
  }
  if (/climate|environment|pollution|green|sustainable|carbon|renewable|nature/i.test(text)) {
    return "environment";
  }
  if (/health|medical|hospital|doctor|disease|vaccine|covid|pandemic|virus/i.test(text)) {
    return "health";
  }
  if (/science|research|study|discovery|space|nasa|physics|biology/i.test(text)) {
    return "science";
  }
  if (/military|war|army|defense|attack|weapon|soldier|conflict|battle/i.test(text)) {
    return "security";
  }
  if (/culture|art|music|film|movie|festival|museum|exhibition|theatre/i.test(text)) {
    return "culture";
  }

  return "general";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ country: string }> }
) {
  try {
    const { country } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const category = searchParams.get("category");

    const countryLower = decodeURIComponent(country).toLowerCase();

    // Fetch from three sources in parallel:
    // 1. Global news APIs (GNews, Guardian) - keyword search for country name
    // 2. Local RSS feeds - country-specific sources (e.g., Polish news sites)
    // 3. Google News local - localized Google News for that country
    const [globalNews, localNews, googleNewsLocal] = await Promise.all([
      fetchGlobalNews(country, Math.ceil(limit / 3)),
      fetchLocalNews(countryLower, Math.ceil(limit / 2)),
      fetchGoogleNewsLocal(countryLower, Math.ceil(limit / 3)),
    ]);

    console.log(`[Country News] Sources for ${country}: global=${globalNews.length}, local=${localNews.length}, googleLocal=${googleNewsLocal.length}`);

    // Combine and deduplicate by URL
    // Prioritize local sources first, then Google News local, then global
    const seenUrls = new Set<string>();
    const allNews: NewsArticle[] = [];

    for (const article of [...localNews, ...googleNewsLocal, ...globalNews]) {
      if (article.url && !seenUrls.has(article.url)) {
        seenUrls.add(article.url);
        allNews.push(article);
      }
    }

    // Filter by category if specified
    let filteredNews = allNews;
    if (category && category !== "all") {
      filteredNews = allNews.filter((a) => a.category === category);
    }

    // Sort by date (newest first)
    filteredNews.sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime();
      const dateB = new Date(b.publishedAt).getTime();
      return dateB - dateA;
    });

    // Limit results
    filteredNews = filteredNews.slice(0, limit);

    return NextResponse.json({
      country: decodeURIComponent(country),
      articles: filteredNews,
      total: filteredNews.length,
    });
  } catch (error) {
    console.error("Error fetching country news:", error);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 }
    );
  }
}
