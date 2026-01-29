import { NextResponse } from "next/server";
import { searchLocalSources, isLocalIntelEnabled } from "@/lib/local-intel";

export const dynamic = "force-dynamic";

// Available regions (matches WebScrapper's local_news_sources.json)
const AVAILABLE_REGIONS = [
  "eastern_europe",
  "middle_east",
  "western_europe",
  "south_america",
  "north_america",
  "oceania",
  "east_asia",
  "central_asia",
  "southeast_asia",
  "south_asia",
  "africa",
  "technology",
  "business",
];

export async function GET(request: Request) {
  if (!isLocalIntelEnabled()) {
    return NextResponse.json(
      { error: "Local intelligence mode is not enabled" },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region");
  const keywords = searchParams.get("keywords") || "";
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  // If no region specified, return available regions
  if (!region) {
    return NextResponse.json({
      availableRegions: AVAILABLE_REGIONS,
      usage: "GET /api/local-sources?region=eastern_europe&keywords=conflict&limit=20",
    });
  }

  // Validate region
  if (!AVAILABLE_REGIONS.includes(region)) {
    return NextResponse.json(
      {
        error: `Invalid region: ${region}`,
        availableRegions: AVAILABLE_REGIONS,
      },
      { status: 400 }
    );
  }

  try {
    const results = await searchLocalSources(region, keywords, limit);

    return NextResponse.json({
      region,
      keywords,
      count: results.length,
      articles: results,
    });
  } catch (error) {
    console.error("Local sources error:", error);
    return NextResponse.json(
      { error: "Failed to fetch local sources" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isLocalIntelEnabled()) {
    return NextResponse.json(
      { error: "Local intelligence mode is not enabled" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { regions, keywords, limit = 20 } = body;

    if (!regions || !Array.isArray(regions) || regions.length === 0) {
      return NextResponse.json(
        { error: "regions array is required" },
        { status: 400 }
      );
    }

    // Validate all regions
    const invalidRegions = regions.filter(r => !AVAILABLE_REGIONS.includes(r));
    if (invalidRegions.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid regions: ${invalidRegions.join(", ")}`,
          availableRegions: AVAILABLE_REGIONS,
        },
        { status: 400 }
      );
    }

    // Fetch from all specified regions in parallel
    const results = await Promise.all(
      regions.map(region => searchLocalSources(region, keywords || "", Math.ceil(limit / regions.length)))
    );

    // Combine and deduplicate results
    const seenUrls = new Set<string>();
    const combinedResults = results.flat().filter(article => {
      if (seenUrls.has(article.url)) return false;
      seenUrls.add(article.url);
      return true;
    });

    // Sort by date
    combinedResults.sort((a, b) => {
      const dateA = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
      const dateB = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json({
      regions,
      keywords,
      count: combinedResults.length,
      articles: combinedResults.slice(0, limit),
    });
  } catch (error) {
    console.error("Local sources error:", error);
    return NextResponse.json(
      { error: "Failed to fetch local sources" },
      { status: 500 }
    );
  }
}
