/**
 * Comprehensive Deep Research API (Streaming)
 *
 * Search order:
 * 1. Google News RSS (global, multi-language indexed)
 * 2. Wikipedia API (background knowledge)
 * 3. Global News APIs (GNews, Guardian)
 * 4. All 600+ Regional RSS feeds with multilingual keyword support
 */

import { NextRequest } from "next/server";
import { streamLLMResponse, type LLMSettings } from "@/lib/local-intel";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max

const WEBSCRAPPER_URL = process.env.WEBSCRAPPER_URL || "http://localhost:3001";

// All available regions
const ALL_REGIONS = [
  "eastern_europe",
  "western_europe",
  "middle_east",
  "east_asia",
  "southeast_asia",
  "south_asia",
  "central_asia",
  "north_america",
  "south_america",
  "africa",
  "oceania",
  "business",
  "technology",
];

// Google News country codes for comprehensive coverage
const GOOGLE_NEWS_COUNTRIES = [
  "US", "GB", "DE", "FR", "RU", "UA", "PL", "IL", "TR", "IN",
  "CN", "JP", "KR", "AU", "BR", "ZA", "NG", "EG", "SA", "IR"
];

// Multilingual keyword mappings for common terms
const KEYWORD_TRANSLATIONS: Record<string, string[]> = {
  // Organizations/Groups
  "wagner": ["wagner", "вагнер", "вагнера", "groupe wagner", "wagner-gruppe", "grupa wagnera", "ワグネル"],
  "wagner group": ["wagner group", "группа вагнера", "groupe wagner", "wagner-gruppe", "grupa wagnera"],
  "hamas": ["hamas", "حماس", "хамас", "ハマス"],
  "hezbollah": ["hezbollah", "حزب الله", "хезболла", "hizbullah", "ヒズボラ"],
  "isis": ["isis", "isil", "داعش", "игил", "islamic state", "état islamique", "islamischer staat"],
  "taliban": ["taliban", "طالبان", "талибан", "タリバン"],
  "houthi": ["houthi", "houthis", "الحوثيين", "حوثي", "хуситы", "ansar allah"],

  // Countries - with native names
  "russia": ["russia", "россия", "российская", "russie", "russland", "rusia", "ロシア", "俄罗斯"],
  "ukraine": ["ukraine", "україна", "украина", "ucrania", "ウクライナ", "乌克兰"],
  "china": ["china", "中国", "中國", "китай", "chine", "中华"],
  "iran": ["iran", "ایران", "иран", "persie", "イラン", "伊朗"],
  "israel": ["israel", "ישראל", "إسرائيل", "израиль", "イスラエル", "以色列"],
  "north korea": ["north korea", "dprk", "조선민주주의인민공화국", "북한", "северная корея", "corée du nord", "朝鲜"],
  "syria": ["syria", "سوريا", "сирия", "syrie", "siria", "シリア", "叙利亚"],
  "palestine": ["palestine", "فلسطين", "палестина", "palestina", "パレスチナ", "巴勒斯坦"],
  "gaza": ["gaza", "غزة", "газа", "ガザ", "加沙"],

  // Military/Conflict terms
  "war": ["war", "война", "guerre", "krieg", "guerra", "wojna", "戦争", "战争", "حرب"],
  "conflict": ["conflict", "конфликт", "conflit", "konflikt", "conflicto", "紛争", "冲突", "صراع"],
  "military": ["military", "военный", "militaire", "militär", "militar", "wojskowy", "軍事", "军事", "عسكري"],
  "attack": ["attack", "атака", "attaque", "angriff", "ataque", "atak", "攻撃", "攻击", "هجوم"],
  "missile": ["missile", "ракета", "missile", "rakete", "misil", "rakieta", "ミサイル", "导弹", "صاروخ"],
  "drone": ["drone", "дрон", "беспилотник", "drohne", "dron", "ドローン", "无人机", "طائرة مسيرة"],
  "sanctions": ["sanctions", "санкции", "sanctions", "sanktionen", "sanciones", "sankcje", "制裁", "عقوبات"],
  "troops": ["troops", "войска", "troupes", "truppen", "tropas", "żołnierze", "部隊", "军队", "قوات"],
  "invasion": ["invasion", "вторжение", "invasion", "einmarsch", "invasión", "inwazja", "侵攻", "入侵", "غزو"],

  // Political terms
  "president": ["president", "президент", "président", "präsident", "presidente", "prezydent", "大統領", "总统", "رئيس"],
  "government": ["government", "правительство", "gouvernement", "regierung", "gobierno", "rząd", "政府", "حكومة"],
  "election": ["election", "выборы", "élection", "wahl", "elección", "wybory", "選挙", "选举", "انتخابات"],
  "coup": ["coup", "переворот", "coup d'état", "putsch", "golpe", "zamach stanu", "クーデター", "政变", "انقلاب"],

  // Security terms
  "terrorism": ["terrorism", "терроризм", "terrorisme", "terrorismus", "terrorismo", "terroryzm", "テロ", "恐怖主义", "إرهاب"],
  "nuclear": ["nuclear", "ядерный", "nucléaire", "nuklear", "nuclear", "nuklearny", "核", "نووي"],
  "cyber": ["cyber", "кибер", "cyber", "cyber", "ciber", "kybernetyczny", "サイバー", "网络", "سيبراني"],
};

interface SearchResult {
  title: string;
  url: string;
  content: string;
  source?: string;
  sourceCountry?: string;
  sourceType?: string;
  publishedDate?: string;
}

interface WikipediaResult {
  title: string;
  extract: string;
  url: string;
}

function parseLLMSettings(body: any): LLMSettings | undefined {
  if (body.llmSettings) {
    return {
      provider: body.llmSettings.provider || "lmstudio",
      serverUrl: body.llmSettings.serverUrl || "http://localhost:1234/v1",
      model: body.llmSettings.model || "",
      apiKey: body.llmSettings.apiKey || "",
    };
  }
  return undefined;
}

/**
 * Expand keywords with multilingual variants
 */
function expandKeywords(topic: string): string {
  const words = topic.toLowerCase().split(/\s+/);
  const expanded = new Set<string>();

  // Add original topic
  expanded.add(topic.toLowerCase());

  // Check each word and multi-word phrases for translations
  for (const [key, translations] of Object.entries(KEYWORD_TRANSLATIONS)) {
    if (topic.toLowerCase().includes(key)) {
      translations.forEach(t => expanded.add(t));
    }
  }

  // Add individual words
  words.forEach(w => {
    if (w.length >= 3) {
      expanded.add(w);
      // Check if word has translations
      const translations = KEYWORD_TRANSLATIONS[w];
      if (translations) {
        translations.forEach(t => expanded.add(t));
      }
    }
  });

  return Array.from(expanded).join(",");
}

/**
 * Search Wikipedia for background information
 */
async function searchWikipedia(topic: string): Promise<WikipediaResult[]> {
  try {
    // Search Wikipedia API
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&srlimit=5&origin=*`;

    const searchResponse = await fetch(searchUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!searchResponse.ok) return [];

    const searchData = await searchResponse.json();
    const pages = searchData.query?.search || [];

    if (pages.length === 0) return [];

    // Get extracts for top results
    const pageIds = pages.map((p: any) => p.pageid).join("|");
    const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&pageids=${pageIds}&prop=extracts&exintro=true&explaintext=true&exlimit=5&format=json&origin=*`;

    const extractResponse = await fetch(extractUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!extractResponse.ok) return [];

    const extractData = await extractResponse.json();
    const pagesData = extractData.query?.pages || {};

    return Object.values(pagesData).map((page: any) => ({
      title: page.title || "Wikipedia",
      extract: page.extract || "",
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title?.replace(/ /g, "_") || "")}`,
    })).filter((p: WikipediaResult) => p.extract.length > 100);
  } catch (error) {
    console.error("[DeepResearch] Wikipedia error:", error);
    return [];
  }
}

/**
 * Search Google News RSS for a specific country/language
 */
async function searchGoogleNews(
  query: string,
  country: string = "US",
  limit: number = 20
): Promise<SearchResult[]> {
  try {
    const params = new URLSearchParams({
      keywords: query,
      region: country.toLowerCase(),
      limit: String(limit),
    });

    const response = await fetch(
      `${WEBSCRAPPER_URL}/api/google-news-local?${params}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.articles || []).map((article: any) => ({
      title: article.title || "Untitled",
      url: article.url || "",
      content: article.description || article.content || "",
      source: article.source?.name || `Google News (${country})`,
      sourceCountry: country,
      sourceType: "google_news",
      publishedDate: article.publishedAt || article.pubDate,
    }));
  } catch (error) {
    console.error(`[DeepResearch] Google News ${country} error:`, error);
    return [];
  }
}

/**
 * Search global news APIs (GNews, Guardian)
 */
async function searchGlobalNews(
  query: string,
  limit: number = 30
): Promise<SearchResult[]> {
  try {
    const params = new URLSearchParams({
      keyword: query,
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
      content: article.description || article.content || "",
      source: article.source?.name || "News",
      sourceType: "global_news",
      publishedDate: article.publishedAt,
    }));
  } catch (error) {
    console.error("[DeepResearch] Global news error:", error);
    return [];
  }
}

/**
 * Search a region's RSS feeds with multilingual keywords
 */
async function searchRegion(
  region: string,
  keywords: string,
  limit: number = 100
): Promise<SearchResult[]> {
  try {
    const params = new URLSearchParams({
      region,
      keywords,
      limit: String(limit),
    });

    const response = await fetch(
      `${WEBSCRAPPER_URL}/api/local-sources?${params}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(60000), // Longer timeout for parsing many feeds
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.articles || []).map((article: any) => ({
      title: article.title || "Untitled",
      url: article.url || "",
      content: article.description || article.content || "",
      source: article.source?.name || "Local Source",
      sourceCountry: article.source?.country || region,
      sourceType: "rss_feed",
      publishedDate: article.publishedAt || article.pubDate,
    }));
  } catch (error) {
    console.error(`[DeepResearch] Region ${region} error:`, error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = await request.json();
    const { topic, includeSecurityAnalysis = false } = body;

    if (!topic) {
      return new Response(
        JSON.stringify({ error: "Topic is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const llmSettings = parseLLMSettings(body);
    const expandedKeywords = expandKeywords(topic);

    console.log(`[DeepResearch] Security analysis: ${includeSecurityAnalysis ? "enabled" : "disabled"}`);

    console.log(`[DeepResearch] Topic: "${topic}"`);
    console.log(`[DeepResearch] Expanded keywords: ${expandedKeywords.substring(0, 200)}...`);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const allResults: SearchResult[] = [];
          const seenUrls = new Set<string>();

          const addResults = (results: SearchResult[], sourceType: string) => {
            let added = 0;
            for (const result of results) {
              if (result.url && !seenUrls.has(result.url)) {
                seenUrls.add(result.url);
                allResults.push({ ...result, sourceType });
                added++;
              }
            }
            return added;
          };

          // ============================================================
          // PHASE 1: Google News (fastest, most comprehensive)
          // ============================================================
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "status",
                message: "Phase 1: Searching Google News across 20 countries...",
              })}\n\n`
            )
          );

          const googlePromises = GOOGLE_NEWS_COUNTRIES.map(country =>
            searchGoogleNews(topic, country, 30)
          );

          const googleResults = await Promise.all(googlePromises);
          let googleCount = 0;
          for (const results of googleResults) {
            googleCount += addResults(results, "google_news");
          }

          console.log(`[DeepResearch] Google News: ${googleCount} articles`);

          // ============================================================
          // PHASE 2: Wikipedia (background knowledge)
          // ============================================================
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "status",
                message: `Phase 2: Fetching Wikipedia background (${googleCount} articles so far)...`,
              })}\n\n`
            )
          );

          const wikiResults = await searchWikipedia(topic);
          let wikiContent = "";

          if (wikiResults.length > 0) {
            wikiContent = "\n\n=== WIKIPEDIA BACKGROUND ===\n";
            for (const wiki of wikiResults) {
              wikiContent += `\n## ${wiki.title}\n${wiki.extract}\nSource: ${wiki.url}\n`;
              // Add to sources list
              allResults.push({
                title: `Wikipedia: ${wiki.title}`,
                url: wiki.url,
                content: wiki.extract,
                source: "Wikipedia",
                sourceType: "wikipedia",
              });
            }
          }

          console.log(`[DeepResearch] Wikipedia: ${wikiResults.length} articles`);

          // ============================================================
          // PHASE 3: Global News APIs (GNews, Guardian)
          // ============================================================
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "status",
                message: `Phase 3: Searching GNews & Guardian APIs...`,
              })}\n\n`
            )
          );

          const globalResults = await searchGlobalNews(topic, 50);
          const globalCount = addResults(globalResults, "global_news");

          console.log(`[DeepResearch] Global News APIs: ${globalCount} articles`);

          // ============================================================
          // PHASE 4: All Regional RSS Feeds (with multilingual keywords)
          // ============================================================
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "status",
                message: `Phase 4: Searching 600+ RSS feeds across ${ALL_REGIONS.length} regions with multilingual keywords...`,
              })}\n\n`
            )
          );

          const regionPromises = ALL_REGIONS.map(region =>
            searchRegion(region, expandedKeywords, 100)
          );

          const regionResults = await Promise.all(regionPromises);
          let rssCount = 0;
          for (let i = 0; i < regionResults.length; i++) {
            rssCount += addResults(regionResults[i], `rss_${ALL_REGIONS[i]}`);
          }

          console.log(`[DeepResearch] Regional RSS: ${rssCount} articles`);

          // ============================================================
          // COMPILE RESULTS
          // ============================================================
          // Sort by date
          allResults.sort((a, b) => {
            const dateA = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
            const dateB = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
            return dateB - dateA;
          });

          console.log(`[DeepResearch] Total unique articles: ${allResults.length}`);

          // Send sources to frontend
          const sources = allResults.map(r => ({
            title: r.title,
            url: r.url,
            source: r.source,
            sourceCountry: r.sourceCountry,
            sourceType: r.sourceType,
          }));

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "sources", sources })}\n\n`
            )
          );

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "status",
                message: `Found ${allResults.length} articles. Generating comprehensive research report...`,
              })}\n\n`
            )
          );

          // ============================================================
          // BUILD SOURCE CONTENT FOR LLM
          // ============================================================
          // Group by source type for organized context
          const bySourceType: Record<string, SearchResult[]> = {};
          for (const result of allResults) {
            const type = result.sourceType || "other";
            if (!bySourceType[type]) bySourceType[type] = [];
            bySourceType[type].push(result);
          }

          let sourceContent = "";

          // Add Wikipedia first (background)
          sourceContent += wikiContent;

          // Add Google News
          if (bySourceType["google_news"]?.length > 0) {
            sourceContent += `\n\n=== GOOGLE NEWS (${bySourceType["google_news"].length} articles) ===\n`;
            for (const article of bySourceType["google_news"].slice(0, 50)) {
              sourceContent += `\n[${article.source}] ${article.title}\n${article.content}\n`;
            }
          }

          // Add Global News APIs
          if (bySourceType["global_news"]?.length > 0) {
            sourceContent += `\n\n=== GLOBAL NEWS APIS (${bySourceType["global_news"].length} articles) ===\n`;
            for (const article of bySourceType["global_news"].slice(0, 30)) {
              sourceContent += `\n[${article.source}] ${article.title}\n${article.content}\n`;
            }
          }

          // Add Regional RSS by region
          for (const region of ALL_REGIONS) {
            const regionKey = `rss_${region}`;
            if (bySourceType[regionKey]?.length > 0) {
              sourceContent += `\n\n=== ${region.toUpperCase()} RSS (${bySourceType[regionKey].length} articles) ===\n`;
              for (const article of bySourceType[regionKey].slice(0, 30)) {
                sourceContent += `\n[${article.source}] ${article.title}\n${article.content}\n`;
              }
            }
          }

          // ============================================================
          // GENERATE LLM ANALYSIS
          // ============================================================
          const now = new Date();
          const dateString = now.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          const year = now.getFullYear();

          // News-focused system prompt with optional security angle
          const systemPrompt = includeSecurityAnalysis
            ? `You are a senior research analyst with expertise in global affairs and security matters, creating a comprehensive research report. Today is ${dateString}. The current year is ${year}.

You have access to ${allResults.length} sources including:
- Wikipedia background articles
- Google News from 20 countries
- GNews and Guardian API results
- 600+ regional RSS feeds in multiple languages

Your analysis must be:
- EXHAUSTIVE: Cover every relevant detail from the sources
- WELL-SOURCED: Reference specific sources when making claims
- MULTILINGUAL AWARE: The sources are in many languages; synthesize all information
- GEOGRAPHICALLY COMPREHENSIVE: Note coverage from all regions
- TEMPORALLY PRECISE: Distinguish between historical and current events
- SECURITY-AWARE: Include threat assessments and capability analysis`
            : `You are a knowledgeable research analyst creating a comprehensive, informative research report. Today is ${dateString}. The current year is ${year}.

You have access to ${allResults.length} sources including:
- Wikipedia background articles
- Google News from 20 countries
- GNews and Guardian API results
- 600+ regional RSS feeds in multiple languages

Your analysis must be:
- EXHAUSTIVE: Cover every relevant detail from the sources
- WELL-SOURCED: Reference specific sources when making claims
- MULTILINGUAL AWARE: The sources are in many languages; synthesize all information
- GEOGRAPHICALLY COMPREHENSIVE: Note coverage from all regions
- TEMPORALLY PRECISE: Distinguish between historical and current events
- BALANCED: Present multiple perspectives where they exist`;

          // Build sections based on whether security analysis is enabled
          const securitySections = includeSecurityAnalysis ? `
### 6. Capabilities & Resources
- Operational capabilities and resources
- Financial backing and funding sources
- Technological capabilities
- Key assets and infrastructure
- Communication and media presence

### 7. Risk & Security Assessment
- Current risk level (Low/Medium/High/Critical)
- Primary concerns and implications
- Potential future developments
- Key indicators to monitor
- Regional stability implications` : "";

          const prompt = `Create a COMPREHENSIVE research report on "${topic}".

This report synthesizes ${allResults.length} sources from across the globe. Be thorough and informative.

## Required Sections:

### 1. Executive Summary
- Key findings and main takeaways
- Current significance and relevance
- Geographic scope
- Most important recent developments (${year})

### 2. Background & Context
- Historical background and origins
- Evolution and key milestones
- Core principles or foundations
- Important context for understanding

### 3. Key Players & Structure
- Major figures and leaders (with names where available)
- Organizational structure or hierarchy
- Key stakeholders and participants
- Relevant demographics or composition

### 4. Geographic Scope
- Primary locations and centers
- Regional presence and activities:
  * Europe
  * Middle East & Africa
  * Asia-Pacific
  * Americas
- International reach and connections

### 5. Current Developments (${year})
- Latest news and events
- Recent announcements and statements
- Ongoing situations
- Emerging trends and changes
${securitySections}

### ${includeSecurityAnalysis ? "8" : "6"}. Relationships & Connections
- Key partnerships and alliances
- Related organizations or entities
- International relations
- Notable collaborations or conflicts

### ${includeSecurityAnalysis ? "9" : "7"}. Timeline of Key Events
- Chronological list of significant events
- Include dates, locations, and outcomes
- Note ongoing vs. concluded developments

### ${includeSecurityAnalysis ? "10" : "8"}. Source Analysis
- Summary of source coverage by region
- Languages represented
- Confidence level for major findings
- Information gaps identified
- Suggestions for further research

---

SOURCE MATERIAL:
${sourceContent}`;

          // Stream LLM response
          for await (const chunk of streamLLMResponse(prompt, systemPrompt, {
            temperature: 0.3,
            maxTokens: 12000, // Very long response
            llmSettings,
          })) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "content", content: chunk })}\n\n`
              )
            );
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );

          controller.close();
        } catch (error) {
          console.error("[DeepResearch] Stream error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: error instanceof Error ? error.message : "Research failed",
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[DeepResearch] Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to start research" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
