/**
 * Translation Service
 * Translates news articles to English using the user's selected LLM
 */

import type { LLMSettings } from "./local-intel";

// Default LLM settings
const DEFAULT_LLM_SETTINGS: LLMSettings = {
  provider: "lmstudio",
  serverUrl: process.env.LM_STUDIO_URL || "http://localhost:1234/v1",
  model: process.env.LLM_MODEL || "",
  apiKey: process.env.OPENAI_API_KEY || "",
};

/**
 * Get the appropriate endpoint for the LLM provider
 */
function getLLMEndpoint(settings: LLMSettings): string {
  const baseUrl = settings.serverUrl.replace(/\/$/, "");

  switch (settings.provider) {
    case "ollama":
      // Ollama uses /api/chat for chat completions
      return `${baseUrl}/api/chat`;
    case "lmstudio":
    case "openai-compatible":
    case "openai":
    default:
      return `${baseUrl}/chat/completions`;
  }
}

/**
 * Format request body for different LLM providers
 */
function formatLLMRequest(
  settings: LLMSettings,
  messages: { role: string; content: string }[],
  options: { temperature?: number; maxTokens?: number }
): object {
  const baseRequest = {
    messages,
    temperature: options.temperature ?? 0.3,
    stream: false,
  };

  switch (settings.provider) {
    case "ollama":
      if (!settings.model) {
        throw new Error("Model name is required for Ollama");
      }
      return {
        model: settings.model,
        messages,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.3,
          num_predict: options.maxTokens ?? 2000,
        },
      };
    case "openai":
      return {
        ...baseRequest,
        model: settings.model || "gpt-4o-mini",
        max_tokens: options.maxTokens ?? 2000,
      };
    case "lmstudio":
    case "openai-compatible":
    default:
      return {
        ...baseRequest,
        model: settings.model || undefined,
        max_tokens: options.maxTokens ?? 2000,
      };
  }
}

/**
 * Parse LLM response based on provider
 */
function parseResponse(settings: LLMSettings, data: unknown): string {
  const response = data as Record<string, unknown>;

  if (settings.provider === "ollama") {
    const message = response.message as { content?: string } | undefined;
    return message?.content || "";
  }

  const choices = response.choices as Array<{ message?: { content?: string } }> | undefined;
  return choices?.[0]?.message?.content || "";
}

export interface TranslationResult {
  translatedTitle: string;
  translatedContent: string;
  originalLanguage: string;
  wasTranslated: boolean;
}

/**
 * Detect if text is likely in English
 * Simple heuristic: check for common English words
 */
function isLikelyEnglish(text: string): boolean {
  const englishIndicators = [
    /\b(the|and|or|is|are|was|were|has|have|had|will|would|could|should|can|may|might)\b/gi,
    /\b(this|that|these|those|with|from|into|about|after|before|during)\b/gi,
  ];

  const words = text.split(/\s+/).length;
  let englishWordCount = 0;

  for (const pattern of englishIndicators) {
    const matches = text.match(pattern);
    englishWordCount += matches?.length || 0;
  }

  // If more than 10% of words are common English words, consider it English
  return englishWordCount / words > 0.1;
}

/**
 * Translate a single article's title and content to English
 */
export async function translateArticle(
  title: string,
  content: string,
  llmSettings?: LLMSettings
): Promise<TranslationResult> {
  const settings = llmSettings || DEFAULT_LLM_SETTINGS;

  // Quick check: if already English, skip translation
  const sampleText = `${title} ${content.slice(0, 200)}`;
  if (isLikelyEnglish(sampleText)) {
    return {
      translatedTitle: title,
      translatedContent: content,
      originalLanguage: "English",
      wasTranslated: false,
    };
  }

  try {
    const messages = [
      {
        role: "system",
        content: `You are a professional translator. Translate the following news article to English.
Maintain the journalistic tone and preserve all factual information.
Respond in JSON format: {"title": "translated title", "content": "translated content", "language": "detected source language"}
If the text is already in English, return it unchanged with language: "English".`,
      },
      {
        role: "user",
        content: `Title: ${title}\n\nContent: ${content.slice(0, 1500)}`,
      },
    ];

    const endpoint = getLLMEndpoint(settings);
    const body = formatLLMRequest(settings, messages, {
      temperature: 0.3,
      maxTokens: 2000,
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (settings.provider === "openai" && settings.apiKey) {
      headers["Authorization"] = `Bearer ${settings.apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      console.error(`[Translator] LLM request failed: ${response.status}`);
      return {
        translatedTitle: title,
        translatedContent: content,
        originalLanguage: "unknown",
        wasTranslated: false,
      };
    }

    const data = await response.json();
    const responseText = parseResponse(settings, data);

    // Try to parse JSON response
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          translatedTitle: parsed.title || title,
          translatedContent: parsed.content || content,
          originalLanguage: parsed.language || "unknown",
          wasTranslated: parsed.language?.toLowerCase() !== "english",
        };
      }
    } catch {
      // If JSON parsing fails, use the raw response as translated content
      console.warn("[Translator] Could not parse JSON response, using raw output");
    }

    return {
      translatedTitle: title,
      translatedContent: content,
      originalLanguage: "unknown",
      wasTranslated: false,
    };
  } catch (error) {
    console.error("[Translator] Translation error:", error);
    return {
      translatedTitle: title,
      translatedContent: content,
      originalLanguage: "unknown",
      wasTranslated: false,
    };
  }
}

/**
 * Batch translate multiple articles
 * Processes in parallel with concurrency limit
 */
export async function translateArticles(
  articles: Array<{ title: string; content: string }>,
  llmSettings?: LLMSettings,
  concurrency: number = 3
): Promise<TranslationResult[]> {
  const results: TranslationResult[] = [];

  // Process in batches to avoid overwhelming the LLM
  for (let i = 0; i < articles.length; i += concurrency) {
    const batch = articles.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((article) =>
        translateArticle(article.title, article.content, llmSettings)
      )
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Check if translation service is available
 */
export async function isTranslationAvailable(
  llmSettings?: LLMSettings
): Promise<boolean> {
  const settings = llmSettings || DEFAULT_LLM_SETTINGS;

  try {
    const endpoint = getLLMEndpoint(settings);
    const baseUrl = endpoint.replace(/\/chat\/completions$/, "").replace(/\/api\/chat$/, "");

    // Try health check or models endpoint
    const healthUrl = settings.provider === "ollama"
      ? `${baseUrl}/api/tags`
      : `${baseUrl}/models`;

    const response = await fetch(healthUrl, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
      headers: settings.provider === "openai" && settings.apiKey
        ? { Authorization: `Bearer ${settings.apiKey}` }
        : {},
    });

    return response.ok;
  } catch {
    return false;
  }
}
