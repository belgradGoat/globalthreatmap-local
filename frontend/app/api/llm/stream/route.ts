import { NextRequest } from "next/server";
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
  options: { temperature?: number; maxTokens?: number }
): object {
  const baseRequest = {
    messages,
    temperature: options.temperature ?? 0.7,
    stream: true,
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
    });
    const headers = getHeaders(settings);

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok || !response.body) {
      return new Response(
        JSON.stringify({ error: `LLM error: ${response.status}` }),
        { status: response.status }
      );
    }

    // Create a transform stream to convert provider-specific format to SSE
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk);

        if (settings.provider === "ollama") {
          // Ollama streams JSON objects, one per line
          const lines = text.split("\n").filter(Boolean);
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.message?.content) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content: parsed.message.content })}\n\n`)
                );
              }
              if (parsed.done) {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              }
            } catch {
              // Skip malformed JSON
            }
          }
        } else {
          // OpenAI-compatible SSE format - pass through
          controller.enqueue(chunk);
        }
      },
    });

    // Pipe the response through the transform
    const stream = response.body.pipeThrough(transformStream);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("LLM stream error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
