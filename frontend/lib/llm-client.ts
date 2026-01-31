/**
 * Unified LLM Client
 * Supports multiple providers: LM Studio, Ollama, OpenAI-compatible servers, OpenAI Cloud
 */

import type { LLMProvider, LLMSettings } from "@/stores/llm-store";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LLMRequestOptions {
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  stream?: boolean;
}

interface LLMResponse {
  content: string;
  model?: string;
}

/**
 * Get the chat completions endpoint for a provider
 */
function getEndpoint(settings: LLMSettings): string {
  const baseUrl = settings.serverUrl.replace(/\/$/, "");

  switch (settings.provider) {
    case "ollama":
      return `${baseUrl}/api/chat`;
    case "lmstudio":
    case "openai-compatible":
    case "openai":
    default:
      // OpenAI-compatible endpoints
      return `${baseUrl}/chat/completions`;
  }
}

/**
 * Format request body for different providers
 */
function formatRequest(
  settings: LLMSettings,
  messages: Message[],
  options: LLMRequestOptions
): object {
  const baseRequest = {
    messages,
    temperature: options.temperature ?? 0.7,
    stream: options.stream ?? false,
  };

  switch (settings.provider) {
    case "ollama":
      return {
        ...baseRequest,
        model: settings.model || "llama3.2",
        options: {
          num_predict: options.maxTokens ?? 2000,
        },
      };

    case "lmstudio":
    case "openai-compatible":
    case "openai":
    default:
      return {
        ...baseRequest,
        model: settings.model || undefined, // Let server use default if not specified
        max_tokens: options.maxTokens ?? 2000,
      };
  }
}

/**
 * Parse response from different providers
 */
function parseResponse(settings: LLMSettings, data: any): LLMResponse {
  switch (settings.provider) {
    case "ollama":
      return {
        content: data.message?.content || "",
        model: data.model,
      };

    case "lmstudio":
    case "openai-compatible":
    case "openai":
    default:
      return {
        content: data.choices?.[0]?.message?.content || "",
        model: data.model,
      };
  }
}

/**
 * Get headers for API request
 */
function getHeaders(settings: LLMSettings): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (settings.provider === "openai" && settings.apiKey) {
    headers["Authorization"] = `Bearer ${settings.apiKey}`;
  }

  return headers;
}

/**
 * Generate a non-streaming LLM response
 */
export async function generateResponse(
  settings: LLMSettings,
  prompt: string,
  systemMessage?: string,
  options: LLMRequestOptions = {}
): Promise<string> {
  const messages: Message[] = [];

  if (systemMessage) {
    messages.push({ role: "system", content: systemMessage });
  }
  messages.push({ role: "user", content: prompt });

  const endpoint = getEndpoint(settings);
  const body = formatRequest(settings, messages, { ...options, stream: false });
  const headers = getHeaders(settings);

  const controller = new AbortController();
  const timeout = options.timeout ?? 120000;
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`LLM error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const parsed = parseResponse(settings, data);
    return parsed.content;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      console.error("LLM request timed out");
      return "";
    }
    console.error("LLM error:", error);
    return "";
  }
}

/**
 * Stream an LLM response
 */
export async function* streamResponse(
  settings: LLMSettings,
  prompt: string,
  systemMessage?: string,
  options: LLMRequestOptions = {}
): AsyncGenerator<string> {
  const messages: Message[] = [];

  if (systemMessage) {
    messages.push({ role: "system", content: systemMessage });
  }
  messages.push({ role: "user", content: prompt });

  const endpoint = getEndpoint(settings);
  const body = formatRequest(settings, messages, { ...options, stream: true });
  const headers = getHeaders(settings);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      throw new Error(`LLM stream error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    if (settings.provider === "ollama") {
      // Ollama streams JSON objects, one per line
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(Boolean);

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content) {
              yield parsed.message.content;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } else {
      // OpenAI-compatible SSE format
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  } catch (error) {
    console.error("LLM stream error:", error);
  }
}

/**
 * Test connection to the LLM provider
 */
export async function testConnection(settings: LLMSettings): Promise<{
  success: boolean;
  message: string;
  models?: string[];
}> {
  try {
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

    const headers = getHeaders(settings);
    const response = await fetch(modelsEndpoint, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        success: false,
        message: `Connection failed: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    let models: string[] = [];

    if (settings.provider === "ollama") {
      models = (data.models || []).map((m: any) => m.name);
    } else {
      models = (data.data || []).map((m: any) => m.id);
    }

    return {
      success: true,
      message: `Connected! Found ${models.length} model(s)`,
      models,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";
    return {
      success: false,
      message,
    };
  }
}

/**
 * Get default settings for a provider
 */
export function getProviderDefaults(provider: LLMProvider): Partial<LLMSettings> {
  switch (provider) {
    case "lmstudio":
      return {
        serverUrl: "http://localhost:1234/v1",
        model: "",
      };
    case "ollama":
      return {
        serverUrl: "http://localhost:11434",
        model: "llama3.2",
      };
    case "openai-compatible":
      return {
        serverUrl: "http://localhost:8080/v1",
        model: "",
      };
    case "openai":
      return {
        serverUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
      };
    default:
      return {};
  }
}
