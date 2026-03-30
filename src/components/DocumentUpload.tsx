"use client";

import { useState, useCallback, useRef } from "react";
import { processDocument, type OCRResult, type UploadedDocument } from "@/lib/ocr-pipeline";
import {
  extractDocument,
  AI_PROVIDERS,
  type AIProviderConfig,
  type AIProviderName,
  type EnhancedExtractionResult,
} from "@/lib/ai-document-reader";
import type { DD214Data } from "@/lib/rules-engine";

// ─── BRAND COLORS (matching page.tsx) ─────────────────────────────────

const brand = {
  midnight: "#030940",
  royal: "#050F69",
  azure: "#2071C6",
  sky: "#68B4E7",
  silver: "#CECBD2",
  ice: "#E7F1FB",
  offwhite: "#FAFAFA",
  white: "#FFFFFF",
  orange: "#CC5800",
};

// ─── AI SETTINGS PANEL ────────────────────────────────────────────────

interface AISettingsProps {
  config: AIProviderConfig | null;
  onConfigChange: (config: AIProviderConfig | null) => void;
}

function AISettingsPanel({ config, onConfigChange }: AISettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [enabled, setEnabled] = useState(config !== null);
  const [provider, setProvider] = useState<AIProviderName>(config?.provider || "claude");
  const [apiKey, setApiKey] = useState(config?.apiKey || "");
  const [endpoint, setEndpoint] = useState(config?.endpoint || "");

  const handleToggle = useCallback((on: boolean) => {
    setEnabled(on);
    if (!on) {
      onConfigChange(null);
    } else if (apiKey) {
      onConfigChange({ provider, apiKey, endpoint: endpoint || undefined });
    }
  }, [provider, apiKey, endpoint, onConfigChange]);

  const handleSave = useCallback(() => {
    if (enabled && apiKey) {
      onConfigChange({ provider, apiKey, endpoint: endpoint || undefined });
    }
  }, [enabled, provider, apiKey, endpoint, onConfigChange]);

  const providerMeta = AI_PROVIDERS[provider];

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-medium transition-colors"
        style={{ color: brand.azure }}
        aria-expanded={isOpen}
      >
        <span style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>
          &#9654;
        </span>
        AI-Powered Reading {enabled ? "(Active)" : "(Off)"}
      </button>

      {isOpen && (
        <div
          className="mt-3 rounded-lg p-4"
          style={{ backgroundColor: brand.ice, border: `1px solid ${brand.sky}` }}
        >
          <p className="text-xs mb-3" style={{ color: brand.royal }}>
            When enabled, an AI vision model reads your document as a backup if OCR struggles
            with handwriting, low quality scans, or complex layouts. Your API key is used
            directly from your browser and never stored on any server.
          </p>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => handleToggle(!enabled)}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              style={{ backgroundColor: enabled ? brand.azure : brand.silver }}
              role="switch"
              aria-checked={enabled}
              aria-label="Enable AI-powered document reading"
            >
              <span
                className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
                style={{ transform: enabled ? "translateX(22px)" : "translateX(4px)" }}
              />
            </button>
            <span className="text-sm" style={{ color: brand.midnight }}>
              {enabled ? "AI Reading Enabled" : "OCR Only"}
            </span>
          </div>

          {enabled && (
            <div className="space-y-3">
              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: brand.midnight }}>
                  AI Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => {
                    setProvider(e.target.value as AIProviderName);
                    setEndpoint("");
                  }}
                  className="w-full rounded-lg p-2 text-sm"
                  style={{ border: `1px solid ${brand.silver}`, color: brand.midnight }}
                >
                  {Object.entries(AI_PROVIDERS).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.displayName}</option>
                  ))}
                </select>
                <p className="text-xs mt-1" style={{ color: brand.silver }}>
                  {providerMeta.description}
                </p>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: brand.midnight }}>
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`Enter your ${providerMeta.displayName} API key`}
                  className="w-full rounded-lg p-2 text-sm"
                  style={{ border: `1px solid ${brand.silver}`, color: brand.midnight }}
                />
                <p className="text-xs mt-1" style={{ color: brand.silver }}>
                  Your key stays in your browser. It is sent directly to {providerMeta.displayName} only.
                </p>
              </div>

              {/* Custom Endpoint (required for Llama, optional for others) */}
              {(providerMeta.requiresEndpoint || provider === "llama") && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: brand.midnight }}>
                    API Endpoint {providerMeta.requiresEndpoint ? "(Required)" : "(Optional)"}
                  </label>
                  <input
                    type="url"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="e.g., https://api.together.xyz/v1/chat/completions"
                    className="w-full rounded-lg p-2 text-sm"
                    style={{ border: `1px solid ${brand.silver}`, color: brand.midnight }}
                  />
                </div>
              )}

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={!apiKey || (providerMeta.requiresEndpoint && !endpoint)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-40"
                style={{ backgroundColor: brand.royal }}
              >
                Save Settings
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DOCUMENT UPLOAD COMPONENT ─────────────────────────────────────────

interface DocumentUploadProps {
  onFieldsExtracted: (fields: Partial<DD214Data>) => void;
  onDocumentsProcessed: (documents: UploadedDocument[]) => void;
}

export default function DocumentUpload({
  onFieldsExtracted,
  onDocumentsProcessed,
}: DocumentUploadProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [processingIndex, setProcessingIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState<"ocr" | "ai">("ocr");
  const [expandedRaw, setExpandedRaw] = useState<number | null>(null);
  const [aiConfig, setAIConfig] = useState<AIProviderConfig | null>(null);
  const [enhancedResults, setEnhancedResults] = useState<Map<number, EnhancedExtractionResult>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const newDocs: UploadedDocument[] = Array.from(files).map((file) => ({
        file,
        status: "pending" as const,
      }));
      setDocuments((prev) => [...prev, ...newDocs]);
    },
    []
  );

  const removeDocument = useCallback((index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
    setEnhancedResults((prev) => {
      const next = new Map(prev);
      next.delete(index);
      return next;
    });
  }, []);

  const processAllDocuments = useCallback(async () => {
    const allResults: UploadedDocument[] = [...documents];
    let dd214Fields: Partial<DD214Data> = {};
    const newEnhanced = new Map(enhancedResults);

    for (let i = 0; i < allResults.length; i++) {
      if (allResults[i].status === "complete") continue;

      setProcessingIndex(i);
      setProgress(0);
      setProgressStage("ocr");
      allResults[i] = { ...allResults[i], status: "processing" };
      setDocuments([...allResults]);

      try {
        if (aiConfig) {
          // ── Enhanced extraction (OCR + AI fallback) ──
          const enhanced = await extractDocument(
            allResults[i].file,
            { aiConfig },
            (stage, p) => {
              setProgressStage(stage);
              setProgress(p);
            },
          );

          newEnhanced.set(i, enhanced);

          // Convert to OCRResult for backward compatibility
          const ocrResult: OCRResult = {
            rawText: enhanced.ocrResult.rawText,
            confidence: enhanced.overallConfidence,
            extractedFields: enhanced.mergedFields,
            documentType: enhanced.aiResult?.documentType || enhanced.ocrResult.documentType,
            warnings: enhanced.warnings,
          };

          allResults[i] = { ...allResults[i], status: "complete", result: ocrResult };
          setDocuments([...allResults]);

          if (ocrResult.documentType === "dd214") {
            for (const [key, value] of Object.entries(enhanced.mergedFields)) {
              if (value && !dd214Fields[key as keyof DD214Data]) {
                (dd214Fields as Record<string, unknown>)[key] = value;
              }
            }
          }
        } else {
          // ── Standard OCR-only extraction ──
          const result: OCRResult = await processDocument(
            allResults[i].file,
            (p) => setProgress(p),
          );

          allResults[i] = { ...allResults[i], status: "complete", result };
          setDocuments([...allResults]);

          if (result.documentType === "dd214") {
            for (const [key, value] of Object.entries(result.extractedFields)) {
              if (value && !dd214Fields[key as keyof DD214Data]) {
                (dd214Fields as Record<string, unknown>)[key] = value;
              }
            }
          }
        }
      } catch (err) {
        allResults[i] = {
          ...allResults[i],
          status: "error",
          errorMessage: err instanceof Error ? err.message : "Processing failed",
        };
        setDocuments([...allResults]);
      }
    }

    setProcessingIndex(null);
    setProgress(0);
    setEnhancedResults(newEnhanced);

    if (Object.keys(dd214Fields).length > 0) {
      onFieldsExtracted(dd214Fields);
    }
    onDocumentsProcessed(allResults);
  }, [documents, aiConfig, enhancedResults, onFieldsExtracted, onDocumentsProcessed]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const pendingCount = documents.filter((d) => d.status === "pending").length;
  const completeCount = documents.filter((d) => d.status === "complete").length;

  const docTypeLabels: Record<string, string> = {
    dd214: "DD-214",
    medical: "VA Medical Records",
    nexus: "Nexus Letter",
    "cp-exam": "C&P Exam",
    unknown: "Unknown Document",
  };

  const docTypeColors: Record<string, string> = {
    dd214: brand.royal,
    medical: brand.azure,
    nexus: brand.sky,
    "cp-exam": brand.midnight,
    unknown: brand.silver,
  };

  return (
    <section className="max-w-2xl mx-auto mb-8">
      {/* AI Settings Panel */}
      <AISettingsPanel config={aiConfig} onConfigChange={setAIConfig} />

      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className="rounded-xl p-8 text-center cursor-pointer transition-all hover:shadow-md focus:outline-2 focus:outline-offset-0"
        role="button"
        tabIndex={0}
        aria-label="Upload documents, drag and drop or click to browse"
        style={{
          border: `2px dashed ${brand.azure}`,
          backgroundColor: brand.ice,
          outlineColor: brand.azure,
        }}
      >
        <div className="text-4xl mb-3" aria-hidden="true">&#128196;</div>
        <h2 className="font-semibold text-lg mb-1" style={{ color: brand.midnight }}>
          Upload Your Documents
        </h2>
        <p className="text-sm mb-3" style={{ color: brand.royal }}>
          Drag &amp; drop your DD-214, medical records, nexus letters, or C&amp;P exams here
        </p>
        <p className="text-xs" style={{ color: brand.silver }}>
          Supports PDF and image files (PNG, JPG). Your documents are processed locally in your browser.
          {aiConfig && (
            <span style={{ color: brand.azure }}> AI-powered reading via {AI_PROVIDERS[aiConfig.provider].displayName} is active.</span>
          )}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
          aria-label="File upload input"
        />
      </div>

      {/* Document List */}
      {documents.length > 0 && (
        <div className="mt-4 space-y-3">
          <h3 className="text-sm font-semibold" style={{ color: brand.midnight }}>Uploaded Documents</h3>
          {documents.map((doc, i) => {
            const enhanced = enhancedResults.get(i);

            return (
              <article
                key={i}
                className="rounded-lg p-4"
                style={{
                  backgroundColor: brand.white,
                  border: `1px solid ${
                    doc.status === "complete"
                      ? brand.azure
                      : doc.status === "error"
                      ? brand.orange
                      : brand.silver
                  }`,
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Status Icon */}
                  <div className="text-xl shrink-0" aria-hidden="true">
                    {doc.status === "pending" && "&#128196;"}
                    {doc.status === "processing" && (
                      <span className="inline-block animate-spin">&#9881;</span>
                    )}
                    {doc.status === "complete" && "&#9989;"}
                    {doc.status === "error" && "&#10060;"}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: brand.midnight }}
                    >
                      {doc.file.name}
                    </p>
                    <p className="text-xs" style={{ color: brand.silver }}>
                      {(doc.file.size / 1024).toFixed(0)} KB
                      {doc.result && (
                        <>
                          {" "}
                          &middot;{" "}
                          <span
                            className="font-semibold"
                            style={{
                              color:
                                docTypeColors[doc.result.documentType] || brand.silver,
                            }}
                          >
                            {docTypeLabels[doc.result.documentType]}
                          </span>
                          {" "}
                          &middot; {Math.round(doc.result.confidence)}% confidence
                          {enhanced?.aiUsed && (
                            <span style={{ color: brand.azure }}> &middot; AI-enhanced</span>
                          )}
                        </>
                      )}
                    </p>
                  </div>

                  {/* Remove button */}
                  {doc.status !== "processing" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeDocument(i);
                      }}
                      className="text-sm px-2 py-1 rounded hover:bg-gray-100 focus:outline-2 focus:outline-offset-0"
                      style={{ color: brand.silver, outlineColor: brand.azure }}
                      aria-label={`Remove ${doc.file.name}`}
                    >
                      &#10005;
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                {doc.status === "processing" && processingIndex === i && (
                  <div className="mt-3">
                    <div
                      className="w-full rounded-full h-2"
                      style={{ backgroundColor: brand.ice }}
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Processing ${doc.file.name}`}
                    >
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: progressStage === "ai" ? brand.royal : brand.azure,
                        }}
                      />
                    </div>
                    <p className="text-xs mt-1" style={{ color: progressStage === "ai" ? brand.royal : brand.azure }}>
                      {progressStage === "ocr" ? (
                        progress < 30
                          ? "Preparing document..."
                          : progress < 90
                          ? "Running OCR..."
                          : "Extracting fields..."
                      ) : (
                        progress < 30
                          ? "Sending to AI for enhanced reading..."
                          : progress < 90
                          ? "AI analyzing document..."
                          : "Merging results..."
                      )}
                    </p>
                  </div>
                )}

                {/* Field Source Badges (when AI was used) */}
                {enhanced?.aiUsed && doc.result?.documentType === "dd214" && (
                  <div
                    className="mt-2 rounded-lg p-2"
                    style={{ backgroundColor: `${brand.royal}10`, border: `1px solid ${brand.royal}30` }}
                  >
                    <p className="text-xs font-medium mb-1" style={{ color: brand.royal }}>
                      Field Sources:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(enhanced.fieldSources).map(([field, source]) => (
                        <span
                          key={field}
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: source === "ai" ? brand.royal : brand.azure,
                            color: brand.white,
                          }}
                        >
                          {fieldLabels[field] || field}: {source === "ai" ? "AI" : "OCR"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {doc.result?.warnings && doc.result.warnings.length > 0 && (
                  <div className="mt-2" role="alert">
                    {doc.result.warnings.map((w, wi) => (
                      <p
                        key={wi}
                        className="text-xs"
                        style={{ color: brand.orange }}
                      >
                        &#9888; {w}
                      </p>
                    ))}
                  </div>
                )}

                {/* Extracted Fields Preview */}
                {doc.result?.documentType === "dd214" &&
                  Object.keys(doc.result.extractedFields).length > 0 && (
                    <div
                      className="mt-3 rounded-lg p-3"
                      style={{
                        backgroundColor: brand.ice,
                        border: `1px solid ${brand.sky}`,
                      }}
                    >
                      <p
                        className="text-xs font-semibold mb-2"
                        style={{ color: brand.royal }}
                      >
                        Extracted DD-214 Fields:
                      </p>
                      <div className="grid grid-cols-2 gap-1">
                        {Object.entries(doc.result.extractedFields).map(
                          ([key, value]) =>
                            value && (
                              <div key={key} className="text-xs">
                                <span
                                  className="font-medium"
                                  style={{ color: brand.midnight }}
                                >
                                  {fieldLabels[key] || key}:{" "}
                                </span>
                                <span style={{ color: brand.azure }}>
                                  {String(value).substring(0, 50)}
                                  {String(value).length > 50 ? "..." : ""}
                                </span>
                              </div>
                            )
                        )}
                      </div>
                    </div>
                  )}

                {/* Raw OCR Text Toggle */}
                {doc.result?.rawText && (
                  <div className="mt-2">
                    <button
                      onClick={() =>
                        setExpandedRaw(expandedRaw === i ? null : i)
                      }
                      className="text-xs font-medium"
                      style={{ color: brand.azure }}
                    >
                      {expandedRaw === i
                        ? "Hide raw OCR text"
                        : "Show raw OCR text"}
                    </button>
                    {expandedRaw === i && (
                      <pre
                        className="mt-2 p-3 rounded-lg text-xs overflow-auto max-h-48"
                        style={{
                          backgroundColor: brand.offwhite,
                          color: brand.midnight,
                          border: `1px solid ${brand.silver}`,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {doc.result.rawText}
                      </pre>
                    )}
                  </div>
                )}

                {/* Error message */}
                {doc.errorMessage && (
                  <p className="mt-2 text-xs" style={{ color: brand.orange }} role="alert">
                    {doc.errorMessage}
                  </p>
                )}
              </article>
            );
          })}

          {/* Process Button */}
          {pendingCount > 0 && (
            <button
              onClick={processAllDocuments}
              disabled={processingIndex !== null}
              className="w-full text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 focus:outline-2 focus:outline-offset-0"
              style={{
                backgroundColor:
                  processingIndex !== null ? brand.silver : brand.royal,
                outlineColor: brand.azure,
              }}
            >
              {processingIndex !== null
                ? progressStage === "ai"
                  ? "AI Analyzing..."
                  : "Processing..."
                : `Scan ${pendingCount} Document${pendingCount > 1 ? "s" : ""}${aiConfig ? " with OCR + AI" : " with OCR"}`}
            </button>
          )}

          {/* Status summary */}
          {completeCount > 0 && pendingCount === 0 && (
            <div
              className="rounded-lg p-4 text-center"
              role="status"
              aria-live="polite"
              style={{ backgroundColor: brand.ice, border: `1px solid ${brand.azure}` }}
            >
              <p className="text-sm font-semibold" style={{ color: brand.royal }}>
                &#9989; {completeCount} document{completeCount > 1 ? "s" : ""} processed
                {Array.from(enhancedResults.values()).some((r) => r.aiUsed) && " (AI-enhanced)"}
              </p>
              <p className="text-xs mt-1" style={{ color: brand.azure }}>
                Extracted fields have been auto-filled below. Review and correct any fields as needed.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ─── FIELD LABELS MAP ──────────────────────────────────────────────────

const fieldLabels: Record<string, string> = {
  name: "Name",
  branch: "Branch",
  mos: "MOS",
  rank: "Rank",
  enteredActiveDuty: "Entered AD",
  separationDate: "Separated",
  characterOfDischarge: "Character",
  decorations: "Decorations",
  dutyLocations: "Duty Assignment",
  remarks: "Remarks",
  narrativeReason: "Narrative Reason",
};
