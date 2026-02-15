/**
 * Country News Summary API
 * Streams AI-generated summaries for news, politics, and business
 */

import { NextRequest, NextResponse } from "next/server";
import { streamNewsSummary, LLMSettings } from "@/lib/local-intel";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // 2 minutes for streaming

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ country: string }> }
) {
  try {
    const { country } = await params;
    const { searchParams } = new URL(request.url);

    const stream = searchParams.get("stream") === "true";
    const llmSettingsParam = searchParams.get("llmSettings");

    let llmSettings: LLMSettings | undefined;
    if (llmSettingsParam) {
      try {
        llmSettings = JSON.parse(llmSettingsParam);
      } catch {
        // Ignore parse errors
      }
    }

    const decodedCountry = decodeURIComponent(country);

    if (!stream) {
      return NextResponse.json({
        error: "Use stream=true for this endpoint",
        usage: `/api/countries/${country}/news-summary?stream=true`,
      }, { status: 400 });
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamNewsSummary(decodedCountry, { llmSettings })) {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        } catch (error) {
          const errorData = `data: ${JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : "Stream error",
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("[News Summary API] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate news summary" },
      { status: 500 }
    );
  }
}
