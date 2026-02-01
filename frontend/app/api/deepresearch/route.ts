/**
 * Comprehensive Deep Research API (Non-streaming)
 * Searches ALL 600+ RSS feeds across all regions
 * Uses local LLM for analysis
 *
 * For streaming responses, use /api/deepresearch/stream instead
 */

import { NextResponse } from "next/server";
import { generateLLMResponse, type LLMSettings } from "@/lib/local-intel";

export const dynamic = "force-dynamic";

const WEBSCRAPPER_URL = process.env.WEBSCRAPPER_URL || "http://localhost:3001";

// All available regions to search
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

interface SearchResult {
  title: string;
  url: string;
  content: string;
  source?: string;
  sourceCountry?: string;
  publishedDate?: string;
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

async function searchRegion(
  region: string,
  keywords: string,
  limit: number = 50
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
        signal: AbortSignal.timeout(30000),
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
      publishedDate: article.publishedAt || article.pubDate,
    }));
  } catch {
    return [];
  }
}

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
      publishedDate: article.publishedAt,
    }));
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topic } = body;

    if (!topic) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    const llmSettings = parseLLMSettings(body);

    // Search ALL regions in parallel + global news
    console.log(`[DeepResearch] Starting comprehensive search for: "${topic}"`);

    const regionPromises = ALL_REGIONS.map((region) =>
      searchRegion(region, topic, 50)
    );
    const globalPromise = searchGlobalNews(topic, 50);

    const [globalResults, ...regionResults] = await Promise.all([
      globalPromise,
      ...regionPromises,
    ]);

    // Combine and deduplicate
    const seenUrls = new Set<string>();
    const allResults: SearchResult[] = [];

    for (const result of globalResults) {
      if (result.url && !seenUrls.has(result.url)) {
        seenUrls.add(result.url);
        allResults.push(result);
      }
    }

    for (let i = 0; i < regionResults.length; i++) {
      const regionArticles = regionResults[i];
      const region = ALL_REGIONS[i];

      for (const result of regionArticles) {
        if (result.url && !seenUrls.has(result.url)) {
          seenUrls.add(result.url);
          allResults.push({
            ...result,
            sourceCountry: result.sourceCountry || region,
          });
        }
      }
    }

    // Sort by date
    allResults.sort((a, b) => {
      const dateA = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
      const dateB = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
      return dateB - dateA;
    });

    console.log(`[DeepResearch] Found ${allResults.length} unique articles`);

    const sources = allResults.map((r) => ({
      title: r.title,
      url: r.url,
      source: r.source,
      sourceCountry: r.sourceCountry,
    }));

    // Group articles by region
    const articlesByRegion: Record<string, SearchResult[]> = {};
    for (const result of allResults) {
      const region = result.sourceCountry || "global";
      if (!articlesByRegion[region]) {
        articlesByRegion[region] = [];
      }
      articlesByRegion[region].push(result);
    }

    // Build source content
    let sourceContent = "";
    for (const [region, articles] of Object.entries(articlesByRegion)) {
      if (articles.length > 0) {
        sourceContent += `\n\n=== ${region.toUpperCase()} (${articles.length} articles) ===\n`;
        for (const article of articles.slice(0, 30)) {
          sourceContent += `\n[${article.source}] ${article.title}\n${article.content}\n`;
        }
      }
    }

    // Get current date context
    const now = new Date();
    const dateString = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const year = now.getFullYear();

    const systemPrompt = `You are a senior intelligence analyst creating a comprehensive, authoritative dossier. Today is ${dateString}. The current year is ${year}.

Your analysis must be exhaustive, well-structured, factual, and geographically comprehensive.
You have access to ${allResults.length} articles from ${Object.keys(articlesByRegion).length} regions.`;

    const prompt = `Create an exhaustive intelligence dossier on "${topic}".

Include these sections:
1. Executive Summary
2. Background & History
3. Organizational Analysis
4. Geographic Presence & Operations
5. Current Activities & Recent Developments (${year})
6. Relationships & Alliances
7. Capabilities Assessment
8. Threat Assessment
9. Detailed Timeline
10. Source Analysis

SOURCE MATERIAL (${allResults.length} articles):
${sourceContent}`;

    const output = await generateLLMResponse(prompt, systemPrompt, {
      temperature: 0.3,
      maxTokens: 8000,
      timeout: 600000, // 10 minutes
      llmSettings,
    });

    return NextResponse.json({
      status: "completed",
      output: output || "Research could not be completed.",
      sources,
    });
  } catch (error) {
    console.error("Deep research error:", error);
    return NextResponse.json(
      { error: "Failed to complete research" },
      { status: 500 }
    );
  }
}
