// ─── AI-ENHANCED DOCUMENT READER ─────────────────────────────────────
// Orchestrates the two-pass extraction flow:
//   Pass 1: Tesseract.js OCR (fast, free, runs in-browser)
//   Pass 2: AI Vision API (when OCR confidence < threshold or key fields missing)
//
// The AI pass is optional — it only runs when an API key is configured
// and the OCR results need improvement.

import type { DD214Data } from "./rules-engine";
import type { OCRResult } from "./ocr-pipeline";
import { processDocument } from "./ocr-pipeline";
import {
  createAIProvider,
  type AIProviderConfig,
  type AIProviderName,
  type AIExtractionResult,
} from "./ai-provider";

// ─── TYPES ─────────────────────────────────────────────────────────────

export interface EnhancedExtractionResult {
  /** The OCR-only result (always present) */
  ocrResult: OCRResult;
  /** The AI-enhanced result (only present if AI pass ran) */
  aiResult?: AIExtractionResult;
  /** Merged fields — AI fills gaps left by OCR */
  mergedFields: Partial<DD214Data>;
  /** Which fields came from which source */
  fieldSources: Record<string, "ocr" | "ai">;
  /** Whether the AI pass was used */
  aiUsed: boolean;
  /** Overall confidence (weighted blend) */
  overallConfidence: number;
  /** Combined warnings from both passes */
  warnings: string[];
}

export interface AIReaderConfig {
  /** AI provider settings (null = AI disabled, OCR-only mode) */
  aiConfig: AIProviderConfig | null;
  /** OCR confidence threshold below which AI kicks in (default: 70) */
  confidenceThreshold?: number;
  /** Minimum number of key fields OCR must extract to skip AI (default: 4) */
  minFieldsThreshold?: number;
  /** Force AI pass even if OCR is confident (useful for testing) */
  forceAI?: boolean;
}

// ─── KEY FIELDS ────────────────────────────────────────────────────────
// These are the most important DD-214 fields. If OCR misses too many,
// the AI pass should run.

const KEY_FIELDS: (keyof DD214Data)[] = [
  "name",
  "branch",
  "rank",
  "separationDate",
  "characterOfDischarge",
];

// ─── FILE TO BASE64 ────────────────────────────────────────────────────

async function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Strip the "data:image/png;base64," prefix
      const base64 = dataUrl.split(",")[1];
      const mimeType = dataUrl.split(":")[1]?.split(";")[0] || "image/png";
      resolve({ data: base64, mimeType });
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// For PDFs, we render the first page to an image for AI vision
async function pdfFirstPageToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport }).promise;

  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.split(",")[1];
  return { data: base64, mimeType: "image/png" };
}

// ─── SHOULD RUN AI ─────────────────────────────────────────────────────

function shouldRunAI(
  ocrResult: OCRResult,
  config: AIReaderConfig,
): boolean {
  // No API key = no AI
  if (!config.aiConfig) return false;

  // User forced AI on
  if (config.forceAI) return true;

  // Not a DD-214 — skip AI for now (can expand later)
  if (ocrResult.documentType !== "dd214" && ocrResult.documentType !== "unknown") {
    return false;
  }

  const threshold = config.confidenceThreshold ?? 70;
  const minFields = config.minFieldsThreshold ?? 4;

  // Low OCR confidence
  if (ocrResult.confidence < threshold) return true;

  // Too many key fields missing
  const extractedKeyFields = KEY_FIELDS.filter(
    (f) => ocrResult.extractedFields[f] !== undefined && ocrResult.extractedFields[f] !== "",
  );
  if (extractedKeyFields.length < minFields) return true;

  return false;
}

// ─── MERGE RESULTS ─────────────────────────────────────────────────────

function mergeResults(
  ocrFields: Partial<DD214Data>,
  aiFields: Partial<DD214Data>,
): { merged: Partial<DD214Data>; sources: Record<string, "ocr" | "ai"> } {
  const merged: Partial<DD214Data> = {};
  const sources: Record<string, "ocr" | "ai"> = {};

  // Start with all OCR fields
  for (const [key, value] of Object.entries(ocrFields)) {
    if (value !== undefined && value !== "") {
      (merged as Record<string, unknown>)[key] = value;
      sources[key] = "ocr";
    }
  }

  // Fill gaps with AI fields
  for (const [key, value] of Object.entries(aiFields)) {
    if (value !== undefined && value !== "" && !(key in merged)) {
      (merged as Record<string, unknown>)[key] = value;
      sources[key] = "ai";
    }
  }

  return { merged, sources };
}

// ─── MAIN ENHANCED EXTRACTION ──────────────────────────────────────────

export async function extractDocument(
  file: File,
  config: AIReaderConfig,
  onProgress?: (stage: "ocr" | "ai", progress: number) => void,
): Promise<EnhancedExtractionResult> {
  const warnings: string[] = [];

  // ── Pass 1: OCR ──
  onProgress?.("ocr", 0);
  const ocrResult = await processDocument(file, (p) => onProgress?.("ocr", p));
  warnings.push(...ocrResult.warnings);

  // ── Decide whether to run AI ──
  if (!shouldRunAI(ocrResult, config)) {
    return {
      ocrResult,
      mergedFields: ocrResult.extractedFields,
      fieldSources: Object.fromEntries(
        Object.keys(ocrResult.extractedFields).map((k) => [k, "ocr" as const]),
      ),
      aiUsed: false,
      overallConfidence: ocrResult.confidence,
      warnings,
    };
  }

  // ── Pass 2: AI Vision ──
  onProgress?.("ai", 0);
  let aiResult: AIExtractionResult | undefined;

  try {
    const provider = createAIProvider(config.aiConfig!);

    // Convert file to base64 for AI vision
    onProgress?.("ai", 10);
    const { data, mimeType } = file.type === "application/pdf"
      ? await pdfFirstPageToBase64(file)
      : await fileToBase64(file);

    onProgress?.("ai", 30);
    aiResult = await provider.extractFromImage(data, mimeType, ocrResult.rawText);
    onProgress?.("ai", 90);

    warnings.push(...aiResult.warnings);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    warnings.push(`AI extraction failed (${config.aiConfig!.provider}): ${errMsg}. Using OCR results only.`);

    return {
      ocrResult,
      mergedFields: ocrResult.extractedFields,
      fieldSources: Object.fromEntries(
        Object.keys(ocrResult.extractedFields).map((k) => [k, "ocr" as const]),
      ),
      aiUsed: false,
      overallConfidence: ocrResult.confidence,
      warnings,
    };
  }

  // ── Merge ──
  const { merged, sources } = mergeResults(
    ocrResult.extractedFields,
    aiResult.extractedFields,
  );

  // Weighted confidence: favor AI when OCR was poor
  const ocrWeight = ocrResult.confidence >= 70 ? 0.6 : 0.3;
  const aiWeight = 1 - ocrWeight;
  const overallConfidence = Math.round(
    ocrResult.confidence * ocrWeight + aiResult.confidence * aiWeight,
  );

  onProgress?.("ai", 100);

  return {
    ocrResult,
    aiResult,
    mergedFields: merged,
    fieldSources: sources,
    aiUsed: true,
    overallConfidence,
    warnings,
  };
}

// ─── RE-EXPORTS for convenience ────────────────────────────────────────

export type { AIProviderConfig, AIProviderName, AIExtractionResult };
export { AI_PROVIDERS } from "./ai-provider";
