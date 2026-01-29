import { NextResponse } from "next/server";
import { checkLocalServices, isLocalIntelEnabled } from "@/lib/local-intel";

export const dynamic = "force-dynamic";

export async function GET() {
  const useLocalIntel = isLocalIntelEnabled();

  if (!useLocalIntel) {
    return NextResponse.json({
      mode: "valyu",
      message: "Using Valyu cloud services",
      localServices: null,
    });
  }

  const services = await checkLocalServices();

  const allServicesUp = services.webscrapper && services.lmStudio;
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
      lmStudio: {
        status: services.lmStudio ? "up" : "down",
        url: process.env.LM_STUDIO_URL || "http://localhost:1234/v1",
        description: "Local LLM for AI analysis",
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
            ? "Start WebScrapper: cd /path/to/WebScrapper/WebScraper && node src/server.js"
            : null,
          lmStudio: !services.lmStudio
            ? "Start LM Studio: Open LM Studio app, load a model, and start the server on port 1234"
            : null,
          ragService: !services.ragService
            ? "Start RAG Service (optional): cd /path/to/WebScrapper/WebScraper && python3 eagle_rag_service.py"
            : null,
        }
      : null,
  });
}
