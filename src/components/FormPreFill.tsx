"use client";

import { useState } from "react";
import type { DD214Data, QuestionnaireData } from "@/lib/rules-engine";
import { getFormConfig } from "@/lib/form-field-maps";

// ─── BRAND COLORS ───────────────────────────────────────────────────────

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

// ─── PROPS INTERFACE ────────────────────────────────────────────────────

interface FormPreFillProps {
  dd214: DD214Data;
  questionnaire: QuestionnaireData;
  recommendedForms: Array<{
    form: string;
    name: string;
    reason: string;
    priority: string;
    benefit: string;
  }>;
}

// ─── HELPER: resolve a dot-notation source field to a value ─────────────

function resolveField(
  sourceField: string,
  dd214: DD214Data,
  questionnaire: QuestionnaireData,
): string | undefined {
  if (!sourceField || sourceField === "auto." || sourceField.startsWith("auto.")) {
    return undefined;
  }

  const [source, ...rest] = sourceField.split(".");
  const key = rest.join(".");

  if (source === "dd214") {
    const val = (dd214 as unknown as Record<string, unknown>)[key];
    return val ? String(val) : undefined;
  }
  if (source === "questionnaire") {
    const val = (questionnaire as unknown as Record<string, unknown>)[key];
    if (typeof val === "boolean") return val ? "Yes" : "No";
    return val ? String(val) : undefined;
  }
  return undefined;
}

// ─── COMPONENT ──────────────────────────────────────────────────────────

export default function FormPreFill({
  dd214,
  questionnaire,
  recommendedForms,
}: FormPreFillProps) {
  // Extract form number from "VA Form 21-526EZ" -> "21-526EZ"
  const stripFormPrefix = (form: string): string => {
    return form.replace(/^VA Form\s+/, "");
  };

  // Build data summary for a given form
  const getFormDataSummary = (formNumber: string) => {
    const config = getFormConfig(formNumber);
    if (!config) return { ready: [], missing: [], onlineUrl: undefined, totalFields: 0 };

    const ready: Array<{ label: string; value: string }> = [];
    const missing: string[] = [];

    for (const mapping of config.fieldMappings) {
      // Skip auto/signature fields — those are filled at submission time
      if (
        mapping.sourceField.startsWith("auto.") ||
        mapping.sourceField === "auto." ||
        mapping.label.toLowerCase().includes("signature") ||
        mapping.label.toLowerCase().includes("date signed")
      ) {
        continue;
      }

      const value = resolveField(mapping.sourceField, dd214, questionnaire);
      if (value) {
        ready.push({ label: mapping.label, value });
      } else if (mapping.required) {
        missing.push(mapping.label);
      }
    }

    return {
      ready,
      missing,
      onlineUrl: config.onlineUrl,
      totalFields: config.fieldMappings.length,
    };
  };

  return (
    <section
      style={{
        backgroundColor: brand.offwhite,
        borderRadius: "12px",
        padding: "32px",
        border: `1px solid ${brand.silver}`,
      }}
    >
      {/* Section Header */}
      <div style={{ marginBottom: "24px" }}>
        <h2
          style={{
            fontSize: "20px",
            fontWeight: "700",
            color: brand.midnight,
            margin: "0 0 8px 0",
          }}
        >
          📋 Start Your VA Forms Online
        </h2>
        <p
          style={{
            fontSize: "14px",
            color: "#6B7280",
            margin: "0",
          }}
        >
          Your data is ready — click to open each form on VA.gov and use the cheat sheet to fill it in
        </p>
      </div>

      {/* Forms Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "20px",
          marginBottom: "28px",
        }}
      >
        {recommendedForms.map((formData) => {
          const formNumber = stripFormPrefix(formData.form);
          const summary = getFormDataSummary(formNumber);
          return (
            <FormCard
              key={formData.form}
              formData={formData}
              readyFields={summary.ready}
              missingFields={summary.missing}
              onlineUrl={summary.onlineUrl}
            />
          );
        })}
      </div>

      {/* VA.gov Tip */}
      <div
        style={{
          backgroundColor: "#E3F2FD",
          borderLeft: `4px solid ${brand.azure}`,
          padding: "16px",
          borderRadius: "8px",
        }}
      >
        <p
          style={{
            fontSize: "13px",
            color: "#1565C0",
            margin: "0",
            lineHeight: "1.5",
          }}
        >
          <strong>Tip:</strong> Sign in to VA.gov with your ID.me or Login.gov account and the VA will pre-fill some fields automatically.
          Your VetsPath cheat sheet covers the rest.
        </p>
      </div>
    </section>
  );
}

// ─── FORM CARD COMPONENT ────────────────────────────────────────────────

interface FormCardProps {
  formData: {
    form: string;
    name: string;
    reason: string;
    priority: string;
    benefit: string;
  };
  readyFields: Array<{ label: string; value: string }>;
  missingFields: string[];
  onlineUrl?: string;
}

function FormCard({ formData, readyFields, missingFields, onlineUrl }: FormCardProps) {
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const getPriorityColor = (priority: string): string => {
    const p = priority.toUpperCase();
    if (p === "FILE FIRST") return "#DC2626";
    if (p === "REQUIRED") return "#2563EB";
    return "#F59E0B";
  };

  const priorityColor = getPriorityColor(formData.priority);
  const priorityBg =
    priorityColor === "#DC2626"
      ? "#FEE2E2"
      : priorityColor === "#2563EB"
        ? "#DBEAFE"
        : "#FEF3C7";

  const readyCount = readyFields.length;
  const totalCount = readyCount + missingFields.length;
  const readyPercent = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0;

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      // Fallback: do nothing if clipboard API not available
    }
  };

  return (
    <div
      style={{
        backgroundColor: brand.white,
        border: `1px solid ${brand.silver}`,
        borderRadius: "8px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Form Header */}
      <div>
        <h3
          style={{
            fontSize: "15px",
            fontWeight: "700",
            color: brand.midnight,
            margin: "0 0 4px 0",
          }}
        >
          {formData.form}
        </h3>
        <p
          style={{
            fontSize: "12px",
            color: "#6B7280",
            margin: "0",
          }}
        >
          {formData.name}
        </p>
      </div>

      {/* Badges */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        {/* Priority Badge */}
        <div
          style={{
            backgroundColor: priorityBg,
            color: priorityColor,
            padding: "4px 10px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: "600",
          }}
        >
          {formData.priority.toUpperCase()}
        </div>

        {/* Benefit Badge */}
        <div
          style={{
            backgroundColor: brand.ice,
            color: brand.azure,
            padding: "4px 10px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: "600",
          }}
        >
          {formData.benefit}
        </div>

        {/* Data Ready Badge */}
        <div
          style={{
            backgroundColor: readyPercent >= 80 ? "#DCFCE7" : readyPercent >= 50 ? "#FEF9C3" : "#FEE2E2",
            color: readyPercent >= 80 ? "#166534" : readyPercent >= 50 ? "#854D0E" : "#991B1B",
            padding: "4px 10px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: "600",
          }}
        >
          {readyCount}/{totalCount} fields ready
        </div>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: "13px",
          color: "#4B5563",
          margin: "0",
          lineHeight: "1.4",
        }}
      >
        {formData.reason}
      </p>

      {/* Data Cheat Sheet Toggle */}
      <button
        onClick={() => setShowCheatSheet(!showCheatSheet)}
        style={{
          backgroundColor: "transparent",
          border: `1px solid ${brand.silver}`,
          padding: "8px 14px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: "600",
          color: brand.azure,
          cursor: "pointer",
          textAlign: "left",
          transition: "background-color 0.15s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = brand.ice;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
        }}
      >
        {showCheatSheet ? "▾ Hide" : "▸ Show"} Your Data Cheat Sheet
      </button>

      {/* Cheat Sheet Content */}
      {showCheatSheet && (
        <div
          style={{
            backgroundColor: "#F9FAFB",
            border: `1px solid ${brand.silver}`,
            borderRadius: "6px",
            padding: "14px",
            maxHeight: "280px",
            overflowY: "auto",
          }}
        >
          {/* Ready Fields */}
          {readyFields.length > 0 && (
            <div style={{ marginBottom: missingFields.length > 0 ? "12px" : "0" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#166534",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "8px",
                }}
              >
                ✓ Data Ready — click to copy
              </div>
              {readyFields.map((field) => (
                <div
                  key={field.label}
                  onClick={() => handleCopy(field.value, field.label)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 8px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                    lineHeight: "1.4",
                    transition: "background-color 0.15s ease",
                    backgroundColor: copiedField === field.label ? "#DCFCE7" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (copiedField !== field.label) {
                      e.currentTarget.style.backgroundColor = "#F3F4F6";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (copiedField !== field.label) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <span style={{ color: "#6B7280", minWidth: "120px" }}>
                    {field.label}
                  </span>
                  <span
                    style={{
                      color: brand.midnight,
                      fontWeight: "600",
                      textAlign: "right",
                      marginLeft: "8px",
                    }}
                  >
                    {copiedField === field.label ? "✓ Copied!" : field.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Missing Fields */}
          {missingFields.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#92400E",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "8px",
                }}
              >
                ⚠ You'll need to provide
              </div>
              {missingFields.map((label) => (
                <div
                  key={label}
                  style={{
                    padding: "4px 8px",
                    fontSize: "12px",
                    color: "#92400E",
                    lineHeight: "1.5",
                  }}
                >
                  • {label}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Button — Open on VA.gov */}
      <a
        href={onlineUrl || `https://www.va.gov/find-forms/about-form-${formData.form.replace(/^VA Form\s+/, "").toLowerCase()}/`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          backgroundColor: brand.azure,
          color: brand.white,
          border: "none",
          padding: "10px 16px",
          borderRadius: "6px",
          fontSize: "13px",
          fontWeight: "600",
          cursor: "pointer",
          transition: "background-color 0.2s ease",
          textDecoration: "none",
          textAlign: "center",
          display: "block",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.backgroundColor = brand.royal;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.backgroundColor = brand.azure;
        }}
      >
        Start Online on VA.gov →
      </a>
    </div>
  );
}
