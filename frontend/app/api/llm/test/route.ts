import { NextRequest, NextResponse } from "next/server";
import type { LLMSettings } from "@/stores/llm-store";

export async function POST(request: NextRequest) {
  try {
    const { settings } = (await request.json()) as { settings: LLMSettings };

    const baseUrl = settings.serverUrl.replace(/\/$/, "");
    let modelsEndpoint: string;

    switch (settings.provider) {
      case "ollama":
        modelsEndpoint = `${baseUrl}/api/tags`;
        break;
      case "lmstudio":
      case "openai-compatible":
      case "openai":
      default:
        modelsEndpoint = `${baseUrl}/models`;
        break;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (settings.provider === "openai" && settings.apiKey) {
      headers["Authorization"] = `Bearer ${settings.apiKey}`;
    }

    const response = await fetch(modelsEndpoint, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        message: `Connection failed: ${response.status} ${response.statusText}`,
      });
    }

    const data = await response.json();
    let models: string[] = [];

    if (settings.provider === "ollama") {
      models = (data.models || []).map((m: { name: string }) => m.name);
    } else {
      models = (data.data || []).map((m: { id: string }) => m.id);
    }

    return NextResponse.json({
      success: true,
      message: `Connected! Found ${models.length} model(s)`,
      models,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";
    return NextResponse.json({
      success: false,
      message,
    });
  }
}
