import { z } from "zod";
import type { EventCategory, ThreatLevel, GeoLocation } from "@/types";
import type { LLMSettings } from "./local-intel";
import { geocodeLocation, extractLocationsFromText } from "./geocoding";
import {
  classifyCategory as keywordClassifyCategory,
  classifyThreatLevel as keywordClassifyThreatLevel,
} from "./event-classifier";

// Default LLM settings (from environment or sensible defaults)
const DEFAULT_LLM_SETTINGS: LLMSettings = {
  provider: "lmstudio",
  serverUrl: process.env.LM_STUDIO_URL || "http://localhost:1234/v1",
  model: process.env.LLM_MODEL || "",
  apiKey: process.env.OPENAI_API_KEY || "",
};

// Zod schema for structured event classification (used for validation)
const EventClassificationSchema = z.object({
  category: z.enum([
    "conflict",
    "protest",
    "disaster",
    "diplomatic",
    "economic",
    "terrorism",
    "cyber",
    "health",
    "environmental",
    "military",
    "crime",
    "piracy",
    "infrastructure",
    "commodities",
  ]),
  threatLevel: z.enum(["critical", "high", "medium", "low", "info"]),
  primaryLocation: z.string(),
  city: z.string().nullable(),
  region: z.string().nullable(),
  country: z.string().nullable(),
});

type EventClassification = z.infer<typeof EventClassificationSchema>;

export interface ClassificationResult {
  category: EventCategory;
  threatLevel: ThreatLevel;
  location: GeoLocation | null;
}

/**
 * Get the appropriate endpoint for the LLM provider
 */
function getLLMEndpoint(settings: LLMSettings): string {
  const baseUrl = settings.serverUrl.replace(/\/$/, "");

  switch (settings.provider) {
    case "ollama":
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
    temperature: options.temperature ?? 0,
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
        format: "json",
        options: {
          temperature: options.temperature ?? 0,
          num_predict: options.maxTokens ?? 300,
        },
      };
    case "openai":
      return {
        ...baseRequest,
        model: settings.model || "gpt-4o-mini",
        max_tokens: options.maxTokens ?? 300,
        response_format: { type: "json_object" },
      };
    case "lmstudio":
    case "openai-compatible":
    default:
      // Don't send response_format — many local models don't support it
      return {
        ...baseRequest,
        model: settings.model || undefined,
        max_tokens: options.maxTokens ?? 300,
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

const SYSTEM_PROMPT = `You are an intelligence analyst classifying global events. Analyze the headline and content to determine:
1. Category - the type of event
2. Threat Level - severity based on potential impact and urgency
3. Location - the primary geographic location where this is happening

You MUST respond with valid JSON only. No other text. Use this exact format:
{"category": "...", "threatLevel": "...", "primaryLocation": "...", "city": "...", "region": "...", "country": "..."}

Categories (pick one):
- conflict: armed conflicts, wars, military clashes
- protest: demonstrations, civil unrest, riots
- disaster: natural disasters, earthquakes, floods, hurricanes, wildfires
- diplomatic: international relations, treaties, sanctions
- economic: financial markets, trade, economic crises
- terrorism: terror attacks, bombings, extremist violence
- cyber: cyberattacks, data breaches, hacking
- health: disease outbreaks, pandemics, public health emergencies
- environmental: climate events, pollution, environmental damage
- military: military exercises, deployments, defense activities
- crime: murders, kidnappings, drug trafficking, shootings, organized crime
- piracy: maritime piracy, shipping attacks, hijacking at sea
- infrastructure: water reservoir levels, power grid, utilities, dams
- commodities: grocery prices, food supply, commodity shortages

Threat levels: critical, high, medium, low, info

LOCATION EXTRACTION IS CRITICAL - be as granular as possible:
- Always extract the most specific location mentioned (city > region > country)
- Include the city name even for well-known locations (e.g., "Mariupol, Ukraine" not just "Ukraine")
- For military/naval events, specify the base, port, or installation name
- Set city and region to null if not identifiable, country to null if not identifiable`;

/**
 * Classify an event using the user's configured LLM provider
 * Extracts category, threat level, and location in a single API call
 */
async function classifyWithAI(
  title: string,
  content: string,
  settings: LLMSettings
): Promise<EventClassification | null> {
  try {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Headline: ${title}\n\nContent: ${content.slice(0, 1000)}` },
    ];

    const endpoint = getLLMEndpoint(settings);
    const body = formatLLMRequest(settings, messages, {
      temperature: 0,
      maxTokens: 300,
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (settings.apiKey && (settings.provider === "openai" || settings.provider === "openai-compatible")) {
      headers["Authorization"] = `Bearer ${settings.apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error(`[AI Classifier] LLM request failed: ${response.status}`, errorBody);
      return null;
    }

    const data = await response.json();
    const responseText = parseResponse(settings, data);

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[AI Classifier] No JSON found in response");
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate with Zod
    const result = EventClassificationSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }

    console.warn("[AI Classifier] Response failed validation:", result.error.issues);

    // Try partial extraction even if validation fails
    return {
      category: parsed.category || "economic",
      threatLevel: parsed.threatLevel || "info",
      primaryLocation: parsed.primaryLocation || "",
      city: parsed.city || null,
      region: parsed.region || null,
      country: parsed.country || null,
    };
  } catch (error) {
    console.error("AI classification error:", error);
    return null;
  }
}

/**
 * Classify an event - uses AI if available, falls back to keyword matching
 * Returns category, threat level, and geocoded location
 */
export async function classifyEvent(
  title: string,
  content: string,
  llmSettings?: LLMSettings
): Promise<ClassificationResult> {
  const fullText = `${title} ${content}`;
  const settings = llmSettings || DEFAULT_LLM_SETTINGS;

  // Try AI classification first
  const aiResult = await classifyWithAI(title, content, settings);

  if (aiResult) {
    // AI classification succeeded - geocode the location with cascading specificity
    let location: GeoLocation | null = null;

    // Try most specific first: city + region + country
    if (aiResult.city && aiResult.country) {
      const cityQuery = aiResult.region
        ? `${aiResult.city}, ${aiResult.region}, ${aiResult.country}`
        : `${aiResult.city}, ${aiResult.country}`;
      location = await geocodeLocation(cityQuery);
    }

    // Try the primary location string (should be most specific)
    if (!location && aiResult.primaryLocation) {
      location = await geocodeLocation(aiResult.primaryLocation);
    }

    // Try region + country
    if (!location && aiResult.region && aiResult.country) {
      location = await geocodeLocation(`${aiResult.region}, ${aiResult.country}`);
    }

    // Last resort: just country
    if (!location && aiResult.country) {
      location = await geocodeLocation(aiResult.country);
    }

    return {
      category: aiResult.category as EventCategory,
      threatLevel: aiResult.threatLevel as ThreatLevel,
      location,
    };
  }

  // Fall back to keyword-based classification
  const category = keywordClassifyCategory(fullText);
  const threatLevel = keywordClassifyThreatLevel(fullText);

  // Fall back to regex-based location extraction
  const locationCandidates = extractLocationsFromText(fullText);
  let location: GeoLocation | null = null;

  for (const candidate of locationCandidates) {
    location = await geocodeLocation(candidate);
    if (location) break;
  }

  return {
    category,
    threatLevel,
    location,
  };
}

/**
 * Check if AI classification is available
 */
export function isAIClassificationEnabled(llmSettings?: LLMSettings): boolean {
  const settings = llmSettings || DEFAULT_LLM_SETTINGS;
  // Available if we have a server URL configured (local providers don't need an API key)
  return !!settings.serverUrl;
}
