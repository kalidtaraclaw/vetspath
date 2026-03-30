// ─── AI PROVIDER ABSTRACTION ─────────────────────────────────────────
// Model-agnostic interface for AI-powered document reading.
// Supports: Claude (default), GPT, Gemini, Llama
//
// This layer acts as a fallback when Tesseract.js OCR produces
// low-confidence results or fails to extract key DD-214 fields.

import type { DD214Data } from "./rules-engine";

// ─── TYPES ─────────────────────────────────────────────────────────────

export type AIProviderName = "claude" | "gpt" | "gemini" | "llama";

export interface AIProviderConfig {
  provider: AIProviderName;
  apiKey: string;
  model?: string;        // Override default model for the provider
  endpoint?: string;     // Custom endpoint (useful for self-hosted Llama)
  temperature?: number;  // Default: 0 for extraction tasks
  maxTokens?: number;    // Default: 4096
}

export interface AIExtractionResult {
  extractedFields: Partial<DD214Data>;
  documentType: "dd214" | "medical" | "nexus" | "cp-exam" | "unknown";
  confidence: number;     // 0-100 AI self-reported confidence
  rawResponse: string;    // Raw AI response for debugging
  provider: AIProviderName;
  warnings: string[];
}

export interface AIProvider {
  name: AIProviderName;
  displayName: string;
  extractFromImage(
    imageBase64: string,
    mimeType: string,
    existingOCRText?: string,
  ): Promise<AIExtractionResult>;
}

// ─── SHARED EXTRACTION PROMPT ──────────────────────────────────────────
// All providers use the same prompt so results are consistent regardless
// of which AI model is behind the scenes.

const EXTRACTION_SYSTEM_PROMPT = `You are a document data extraction assistant for a VA benefits application. Your job is to extract structured data from military documents, primarily DD-214 forms.

You will receive an image of a document. Extract all fields you can identify and return them as JSON.

IMPORTANT: Return ONLY valid JSON with no markdown formatting, no code fences, no explanation. Just the raw JSON object.`;

const EXTRACTION_USER_PROMPT = (existingOCRText?: string) => `Extract all identifiable fields from this document image and return them as a JSON object with this exact structure:

{
  "documentType": "dd214" | "medical" | "nexus" | "cp-exam" | "unknown",
  "confidence": <number 0-100>,
  "fields": {
    "name": "<veteran's full name from Block 1>",
    "branch": "<branch of service from Block 2>",
    "rank": "<grade/rank from Block 4a>",
    "mos": "<primary specialty from Block 11>",
    "enteredActiveDuty": "<date in YYYY-MM-DD format from Block 12a>",
    "separationDate": "<date in YYYY-MM-DD format from Block 12b>",
    "characterOfDischarge": "<character of service from Block 24>",
    "decorations": "<decorations from Block 13>",
    "dutyLocations": "<last duty assignment from Block 8a>",
    "remarks": "<remarks from Block 18>",
    "narrativeReason": "<narrative reason from Block 28>"
  },
  "warnings": ["<any issues or uncertainties>"]
}

Only include fields you can confidently read. Omit fields you cannot identify.
For dates, convert military format (e.g., "08 JUN 2005") to YYYY-MM-DD.
For character of discharge, normalize to: "Honorable", "General (Under Honorable Conditions)", "Other Than Honorable", "Bad Conduct", or "Dishonorable".

${existingOCRText ? `\nFor reference, OCR previously extracted this text (may contain errors):\n---\n${existingOCRText.substring(0, 2000)}\n---\nUse the image as the primary source and the OCR text only to resolve ambiguities.` : ""}

Return ONLY the JSON object, nothing else.`;

// ─── RESPONSE PARSER ───────────────────────────────────────────────────

function parseAIResponse(raw: string, providerName: AIProviderName): AIExtractionResult {
  const warnings: string[] = [];

  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  try {
    const parsed = JSON.parse(cleaned);
    return {
      extractedFields: parsed.fields || {},
      documentType: parsed.documentType || "unknown",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 50,
      rawResponse: raw,
      provider: providerName,
      warnings: [...(parsed.warnings || []), ...warnings],
    };
  } catch {
    warnings.push("AI response was not valid JSON. Attempting partial extraction.");

    // Try to extract JSON from the response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          extractedFields: parsed.fields || {},
          documentType: parsed.documentType || "unknown",
          confidence: typeof parsed.confidence === "number" ? parsed.confidence : 30,
          rawResponse: raw,
          provider: providerName,
          warnings: [...(parsed.warnings || []), ...warnings],
        };
      } catch {
        // Fall through
      }
    }

    return {
      extractedFields: {},
      documentType: "unknown",
      confidence: 0,
      rawResponse: raw,
      provider: providerName,
      warnings: ["Failed to parse AI response. The document may need manual entry."],
    };
  }
}

// ─── CLAUDE PROVIDER ───────────────────────────────────────────────────

function createClaudeProvider(config: AIProviderConfig): AIProvider {
  const model = config.model || "claude-sonnet-4-20250514";
  const endpoint = config.endpoint || "https://api.anthropic.com/v1/messages";

  return {
    name: "claude",
    displayName: "Claude (Anthropic)",
    async extractFromImage(imageBase64, mimeType, existingOCRText) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model,
          max_tokens: config.maxTokens || 4096,
          temperature: config.temperature ?? 0,
          system: EXTRACTION_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mimeType,
                    data: imageBase64,
                  },
                },
                {
                  type: "text",
                  text: EXTRACTION_USER_PROMPT(existingOCRText),
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Claude API error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const rawText = data.content?.[0]?.text || "";
      return parseAIResponse(rawText, "claude");
    },
  };
}

// ─── GPT PROVIDER ──────────────────────────────────────────────────────

function createGPTProvider(config: AIProviderConfig): AIProvider {
  const model = config.model || "gpt-4o";
  const endpoint = config.endpoint || "https://api.openai.com/v1/chat/completions";

  return {
    name: "gpt",
    displayName: "GPT (OpenAI)",
    async extractFromImage(imageBase64, mimeType, existingOCRText) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: config.maxTokens || 4096,
          temperature: config.temperature ?? 0,
          messages: [
            {
              role: "system",
              content: EXTRACTION_SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${imageBase64}`,
                    detail: "high",
                  },
                },
                {
                  type: "text",
                  text: EXTRACTION_USER_PROMPT(existingOCRText),
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content || "";
      return parseAIResponse(rawText, "gpt");
    },
  };
}

// ─── GEMINI PROVIDER ───────────────────────────────────────────────────

function createGeminiProvider(config: AIProviderConfig): AIProvider {
  const model = config.model || "gemini-2.0-flash";
  const baseEndpoint = config.endpoint || "https://generativelanguage.googleapis.com/v1beta";

  return {
    name: "gemini",
    displayName: "Gemini (Google)",
    async extractFromImage(imageBase64, mimeType, existingOCRText) {
      const endpoint = `${baseEndpoint}/models/${model}:generateContent?key=${config.apiKey}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: imageBase64,
                  },
                },
                {
                  text: `${EXTRACTION_SYSTEM_PROMPT}\n\n${EXTRACTION_USER_PROMPT(existingOCRText)}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: config.temperature ?? 0,
            maxOutputTokens: config.maxTokens || 4096,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return parseAIResponse(rawText, "gemini");
    },
  };
}

// ─── LLAMA PROVIDER ────────────────────────────────────────────────────
// Llama requires a self-hosted or third-party endpoint (e.g., Together,
// Fireworks, Ollama). The user must supply a custom endpoint.

function createLlamaProvider(config: AIProviderConfig): AIProvider {
  const model = config.model || "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo";
  const endpoint = config.endpoint || "https://api.together.xyz/v1/chat/completions";

  return {
    name: "llama",
    displayName: "Llama (Meta)",
    async extractFromImage(imageBase64, mimeType, existingOCRText) {
      // Together/Fireworks-style OpenAI-compatible API
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: config.maxTokens || 4096,
          temperature: config.temperature ?? 0,
          messages: [
            {
              role: "system",
              content: EXTRACTION_SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${imageBase64}`,
                  },
                },
                {
                  type: "text",
                  text: EXTRACTION_USER_PROMPT(existingOCRText),
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Llama API error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content || "";
      return parseAIResponse(rawText, "llama");
    },
  };
}

// ─── PROVIDER FACTORY ──────────────────────────────────────────────────

export function createAIProvider(config: AIProviderConfig): AIProvider {
  switch (config.provider) {
    case "claude":
      return createClaudeProvider(config);
    case "gpt":
      return createGPTProvider(config);
    case "gemini":
      return createGeminiProvider(config);
    case "llama":
      return createLlamaProvider(config);
    default:
      throw new Error(`Unknown AI provider: ${config.provider}`);
  }
}

// ─── PROVIDER METADATA ─────────────────────────────────────────────────

export const AI_PROVIDERS: Record<AIProviderName, {
  displayName: string;
  defaultModel: string;
  description: string;
  requiresEndpoint: boolean;
}> = {
  claude: {
    displayName: "Claude (Anthropic)",
    defaultModel: "claude-sonnet-4-20250514",
    description: "Anthropic's Claude — excellent at document understanding and structured extraction.",
    requiresEndpoint: false,
  },
  gpt: {
    displayName: "GPT (OpenAI)",
    defaultModel: "gpt-4o",
    description: "OpenAI's GPT-4o — strong vision capabilities for document reading.",
    requiresEndpoint: false,
  },
  gemini: {
    displayName: "Gemini (Google)",
    defaultModel: "gemini-2.0-flash",
    description: "Google's Gemini — fast and capable multimodal model.",
    requiresEndpoint: false,
  },
  llama: {
    displayName: "Llama (Meta)",
    defaultModel: "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo",
    description: "Meta's Llama — open-source, can be self-hosted. Requires a compatible API endpoint.",
    requiresEndpoint: true,
  },
};
