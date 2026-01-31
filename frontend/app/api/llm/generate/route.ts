import { NextRequest, NextResponse } from "next/server";
import type { LLMSettings } from "@/stores/llm-store";

// Default settings from environment (fallback)
const DEFAULT_SETTINGS: LLMSettings = {
  provider: "lmstudio",
  serverUrl: process.env.LM_STUDIO_URL || "http://localhost:1234/v1",
  model: process.env.LLM_MODEL || "",
  apiKey: process.env.OPENAI_API_KEY || "",
};

function getEndpoint(settings: LLMSettings): string {
  const baseUrl = settings.serverUrl.replace(/\/$/, "");

  switch (settings.provider) {
    case "ollama":
      return `${baseUrl}/api/chat`;
    default:
      return `${baseUrl}/chat/completions`;
  }
}

function formatRequest(
  settings: LLMSettings,
  messages: { role: string; content: string }[],
  options: { temperature?: number; maxTokens?: number; stream?: boolean }
): object {
  const baseRequest = {
    messages,
    temperature: options.temperature ?? 0.7,
    stream: options.stream ?? false,
  };

  if (settings.provider === "ollama") {
    return {
      ...baseRequest,
      model: settings.model || "llama3.2",
      options: {
        num_predict: options.maxTokens ?? 2000,
      },
    };
  }

  return {
    ...baseRequest,
    model: settings.model || undefined,
    max_tokens: options.maxTokens ?? 2000,
  };
}

function getHeaders(settings: LLMSettings): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (settings.provider === "openai" && settings.apiKey) {
    headers["Authorization"] = `Bearer ${settings.apiKey}`;
  }

  return headers;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      systemMessage,
      settings: clientSettings,
      options = {},
    } = body;

    // Merge client settings with defaults
    const settings: LLMSettings = {
      ...DEFAULT_SETTINGS,
      ...clientSettings,
    };

    const messages: { role: string; content: string }[] = [];
    if (systemMessage) {
      messages.push({ role: "system", content: systemMessage });
    }
    messages.push({ role: "user", content: prompt });

    const endpoint = getEndpoint(settings);
    const requestBody = formatRequest(settings, messages, {
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      stream: false,
    });
    const headers = getHeaders(settings);

    const controller = new AbortController();
    const timeout = options.timeout ?? 120000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(
        { error: `LLM error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Parse response based on provider
    let content: string;
    if (settings.provider === "ollama") {
      content = data.message?.content || "";
    } else {
      content = data.choices?.[0]?.message?.content || "";
    }

    return NextResponse.json({ content, model: data.model });
  } catch (error) {
    console.error("LLM generate error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
