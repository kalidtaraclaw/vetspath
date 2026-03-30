// ─── AI CONFIGURATION ────────────────────────────────────────────────
// Centralized AI provider config. To change the provider or API key,
// update this file. This is NOT exposed in the UI by design.
//
// Supported providers: "claude" | "gpt" | "gemini" | "llama"

import type { AIProviderConfig } from "./ai-provider";

const AI_CONFIG: AIProviderConfig = {
  provider: "gemini",
  apiKey: process.env.NEXT_PUBLIC_AI_API_KEY || "AIzaSyCElL7gcUvQvJbC0Byyo8PKbLAX9knIGeM",
  model: "gemini-2.0-flash",
  temperature: 0,
  maxTokens: 4096,
};

export default AI_CONFIG;
