import { NextRequest, NextResponse } from "next/server";
import { checkLocalServices, isLocalIntelEnabled, type LLMSettings } from "@/lib/local-intel";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const useLocalIntel = isLocalIntelEnabled();

  if (!useLocalIntel) {
    return NextResponse.json({
      mode: "valyu",
      message: "Using Valyu cloud services",
      localServices: null,
    });
  }

  // Try to get LLM settings from query params (for testing)
  const { searchParams } = new URL(request.url);
  let llmSettings: LLMSettings | undefined;

  const provider = searchParams.get("provider");
  const serverUrl = searchParams.get("serverUrl");

  if (provider && serverUrl) {
    llmSettings = {
      provider: provider as LLMSettings["provider"],
      serverUrl,
      model: searchParams.get("model") || "",
      apiKey: searchParams.get("apiKey") || "",
    };
  }

  const services = await checkLocalServices(llmSettings);

  const allServicesUp = services.webscrapper && services.llm;
  const status = allServicesUp ? "healthy" : "degraded";

  return NextResponse.json({
    mode: "local",
    status,
    message: allServicesUp
      ? "All local services are running"
      : "Some local services are unavailable",
    services: {
      webscrapper: {
        status: services.webscrapper ? "up" : "down",
        url: process.env.WEBSCRAPPER_URL || "http://localhost:3001",
        description: "News aggregation (GNews, Guardian, RSS feeds)",
      },
      llm: {
        status: services.llm ? "up" : "down",
        provider: services.llmProvider || "lmstudio",
        models: services.llmModels?.slice(0, 5) || [],
        description: "LLM for AI analysis (LM Studio, Ollama, OpenAI)",
      },
      ragService: {
        status: services.ragService ? "up" : "down",
        url: process.env.RAG_SERVICE_URL || "http://localhost:8001",
        description: "Vector search (optional)",
      },
    },
    instructions: !allServicesUp
      ? {
          webscrapper: !services.webscrapper
            ? "Start backend: cd backend && npm start"
            : null,
          llm: !services.llm
            ? "Start an LLM server: LM Studio (port 1234) or Ollama (port 11434). Configure in Settings."
            : null,
          ragService: !services.ragService
            ? "RAG Service is optional for advanced vector search"
            : null,
        }
      : null,
  });
}

// POST endpoint for testing LLM settings without saving
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const llmSettings: LLMSettings = body.settings;

    if (!llmSettings) {
      return NextResponse.json(
        { error: "Settings are required" },
        { status: 400 }
      );
    }

    const services = await checkLocalServices(llmSettings);

    return NextResponse.json({
      llm: {
        connected: services.llm,
        provider: services.llmProvider,
        models: services.llmModels || [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to test connection" },
      { status: 500 }
    );
  }
}
