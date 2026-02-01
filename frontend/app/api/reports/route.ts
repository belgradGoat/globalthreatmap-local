/**
 * Reports API
 * Generates research reports using local LLM
 */

import { NextResponse } from "next/server";
import { deepResearch, type LLMSettings } from "@/lib/local-intel";

export const dynamic = "force-dynamic";

// Parse LLM settings from request body
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topic, type } = body;

    if (!topic) {
      return NextResponse.json(
        { error: "Research topic is required" },
        { status: 400 }
      );
    }

    const llmSettings = parseLLMSettings(body);

    let enhancedQuery = topic;

    switch (type) {
      case "geopolitical":
        enhancedQuery = `geopolitical analysis ${topic} regional tensions diplomatic relations`;
        break;
      case "economic":
        enhancedQuery = `economic analysis ${topic} trade sanctions financial impact`;
        break;
      case "security":
        enhancedQuery = `security threat analysis ${topic} military defense`;
        break;
      case "humanitarian":
        enhancedQuery = `humanitarian crisis ${topic} refugee displacement aid`;
        break;
      default:
        enhancedQuery = `comprehensive analysis ${topic}`;
    }

    const research = await deepResearch(enhancedQuery, { llmSettings });

    return NextResponse.json({
      report: {
        id: `report_${Date.now()}`,
        topic,
        type: type || "general",
        summary: research.summary,
        sources: research.sources,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
