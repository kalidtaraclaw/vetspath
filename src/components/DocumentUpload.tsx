"use client";

import { useState, useCallback, useRef } from "react";
import { processDocument, type OCRResult, type UploadedDocument } from "@/lib/ocr-pipeline";
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
  const [expandedRaw, setExpandedRaw] = useState<number | null>(null);
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
  }, []);

  const processAllDocuments = useCallback(async () => {
    const allResults: UploadedDocument[] = [...documents];
    let dd214Fields: Partial<DD214Data> = {};

    for (let i = 0; i < allResults.length; i++) {
      if (allResults[i].status === "complete") continue;

      setProcessingIndex(i);
      setProgress(0);
      allResults[i] = { ...allResults[i], status: "processing" };
      setDocuments([...allResults]);

      try {
        const result: OCRResult = await processDocument(
          allResults[i].file,
          (p) => setProgress(p)
        );

        allResults[i] = { ...allResults[i], status: "complete", result };
        setDocuments([...allResults]);

        // Merge DD-214 fields (first DD-214 wins for each field)
        if (result.documentType === "dd214") {
          dd214Fields = { ...result.extractedFields, ...dd214Fields };
          // Actually, extracted fields should override existing only if not already set
          for (const [key, value] of Object.entries(result.extractedFields)) {
            if (value && !dd214Fields[key as keyof DD214Data]) {
              (dd214Fields as Record<string, unknown>)[key] = value;
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

    // Send extracted fields back to parent
    if (Object.keys(dd214Fields).length > 0) {
      onFieldsExtracted(dd214Fields);
    }
    onDocumentsProcessed(allResults);
  }, [documents, onFieldsExtracted, onDocumentsProcessed]);

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
          {documents.map((doc, i) => (
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
                        backgroundColor: brand.azure,
                      }}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: brand.azure }}>
                    {progress < 30
                      ? "Preparing document..."
                      : progress < 90
                      ? "Running OCR..."
                      : "Extracting fields..."}
                  </p>
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
          ))}

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
                ? "Processing..."
                : `Scan ${pendingCount} Document${pendingCount > 1 ? "s" : ""} with OCR`}
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
