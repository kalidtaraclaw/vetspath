"use client";

import { useState } from "react";
import type { DD214Data, QuestionnaireData } from "@/lib/rules-engine";
import {
  fillForm,
  type VeteranProfile,
  type FormFillResult,
} from "@/lib/pdf-filler";

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

// ─── STATE INTERFACES ───────────────────────────────────────────────────

interface FormState {
  loading: boolean;
  result?: FormFillResult;
  error?: string;
  downloaded: boolean;
}

// ─── COMPONENT ──────────────────────────────────────────────────────────

export default function FormPreFill({
  dd214,
  questionnaire,
  recommendedForms,
}: FormPreFillProps) {
  const [formStates, setFormStates] = useState<Record<string, FormState>>({});
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Build veteran profile from props
  const veteranProfile: VeteranProfile = {
    dd214,
    questionnaire,
    personalInfo: {
      // These will need to be filled in manually on the form
      ssn: undefined,
      dob: undefined,
      address: undefined,
      city: undefined,
      state: undefined,
      zip: undefined,
      phone: undefined,
      email: undefined,
      gender: undefined,
    },
  };

  // Extract form number from "VA Form 21-526EZ" -> "21-526EZ"
  const stripFormPrefix = (form: string): string => {
    return form.replace(/^VA Form\s+/, "");
  };

  // Handle individual form generation and download
  const handlePreFillForm = async (formData: (typeof recommendedForms)[0]) => {
    const formId = formData.form;
    const formNumber = stripFormPrefix(formData.form);

    // Set loading state
    setFormStates((prev) => ({
      ...prev,
      [formId]: { loading: true, error: undefined, downloaded: false },
    }));

    try {
      // Call fillForm with the veteran profile
      const result = await fillForm(formNumber, veteranProfile);

      // Update state with result
      setFormStates((prev) => ({
        ...prev,
        [formId]: {
          loading: false,
          result,
          error: undefined,
          downloaded: false,
        },
      }));

      // Trigger download
      downloadPDF(result.pdfBytes, `VA_Form_${formNumber}.pdf`);

      // Mark as downloaded
      setFormStates((prev) => ({
        ...prev,
        [formId]: { ...prev[formId], downloaded: true },
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate form";
      setFormStates((prev) => ({
        ...prev,
        [formId]: {
          loading: false,
          error: errorMessage,
          downloaded: false,
        },
      }));
    }
  };

  // Handle download all forms
  const handleDownloadAll = async () => {
    setDownloadingAll(true);

    try {
      for (const form of recommendedForms) {
        const formId = form.form;
        const formNumber = stripFormPrefix(form.form);

        // Skip if already downloaded
        if (formStates[formId]?.downloaded) {
          continue;
        }

        try {
          const result = await fillForm(formNumber, veteranProfile);

          // Trigger download
          downloadPDF(result.pdfBytes, `VA_Form_${formNumber}.pdf`);

          // Update state
          setFormStates((prev) => ({
            ...prev,
            [formId]: {
              loading: false,
              result,
              error: undefined,
              downloaded: true,
            },
          }));
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to generate form";
          setFormStates((prev) => ({
            ...prev,
            [formId]: {
              loading: false,
              error: errorMessage,
              downloaded: false,
            },
          }));
        }
      }
    } finally {
      setDownloadingAll(false);
    }
  };

  // Helper to trigger PDF download
  const downloadPDF = (pdfBytes: Uint8Array, filename: string) => {
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
          📋 Pre-Fill Your VA Forms
        </h2>
        <p
          style={{
            fontSize: "14px",
            color: "#6B7280",
            margin: "0",
          }}
        >
          We'll auto-fill your information from your DD-214 and questionnaire
        </p>
      </div>

      {/* Forms Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "20px",
          marginBottom: "28px",
        }}
      >
        {recommendedForms.map((formData) => (
          <FormCard
            key={formData.form}
            formData={formData}
            state={formStates[formData.form] || { loading: false, downloaded: false }}
            onPreFill={() => handlePreFillForm(formData)}
          />
        ))}
      </div>

      {/* Download All Button */}
      {recommendedForms.length > 1 && (
        <div style={{ marginBottom: "28px" }}>
          <button
            onClick={handleDownloadAll}
            disabled={downloadingAll}
            style={{
              backgroundColor: brand.azure,
              color: brand.white,
              border: "none",
              padding: "12px 24px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: downloadingAll ? "not-allowed" : "pointer",
              opacity: downloadingAll ? 0.7 : 1,
              transition: "background-color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (!downloadingAll) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  brand.royal;
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                brand.azure;
            }}
          >
            {downloadingAll ? "Generating All Forms..." : "Download All Forms"}
          </button>
        </div>
      )}

      {/* Personal Info Note */}
      <div
        style={{
          backgroundColor: "#FEF3C7",
          borderLeft: `4px solid ${brand.orange}`,
          padding: "16px",
          borderRadius: "8px",
          marginBottom: "20px",
        }}
      >
        <p
          style={{
            fontSize: "13px",
            color: "#92400E",
            margin: "0",
            lineHeight: "1.5",
          }}
        >
          <strong>Manual fields needed:</strong> Some fields (SSN, date of birth, address) will need to be filled in
          manually on the downloaded forms to protect your privacy.
        </p>
      </div>

      {/* Disclaimer */}
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
            fontSize: "12px",
            color: "#1565C0",
            margin: "0",
            lineHeight: "1.5",
          }}
        >
          These are pre-filled drafts. Always submit the official VA form from
          {" "}
          <a
            href="https://www.va.gov/find-forms/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#1565C0",
              textDecoration: "underline",
            }}
          >
            va.gov/find-forms/
          </a>
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
  state: FormState;
  onPreFill: () => void;
}

function FormCard({ formData, state, onPreFill }: FormCardProps) {
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

      {/* Result Summary */}
      {state.result && (
        <div
          style={{
            backgroundColor: "#F0FDF4",
            padding: "12px",
            borderRadius: "6px",
            fontSize: "12px",
            color: "#166534",
          }}
        >
          <div style={{ fontWeight: "600", marginBottom: "6px" }}>
            {state.result.filledCount} of {state.result.totalFields} fields
            filled ({state.result.fillPercentage}%)
          </div>

          <details
            style={{
              cursor: "pointer",
            }}
          >
            <summary
              style={{
                fontSize: "11px",
                color: "#15803D",
                fontWeight: "500",
                userSelect: "none",
              }}
            >
              Show breakdown
            </summary>
            <div
              style={{
                marginTop: "8px",
                fontSize: "11px",
                lineHeight: "1.6",
              }}
            >
              <div>Filled: {state.result.filledCount}</div>
              <div>Empty: {state.result.emptyCount}</div>
            </div>
          </details>
        </div>
      )}

      {/* Error Message */}
      {state.error && (
        <div
          style={{
            backgroundColor: "#FEE2E2",
            padding: "12px",
            borderRadius: "6px",
            fontSize: "12px",
            color: "#991B1B",
            lineHeight: "1.4",
          }}
        >
          <strong>Error:</strong> {state.error}
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={onPreFill}
        disabled={state.loading}
        style={{
          backgroundColor: state.downloaded ? "#10B981" : brand.azure,
          color: brand.white,
          border: "none",
          padding: "10px 16px",
          borderRadius: "6px",
          fontSize: "13px",
          fontWeight: "600",
          cursor: state.loading ? "not-allowed" : "pointer",
          opacity: state.loading ? 0.7 : 1,
          transition: "background-color 0.2s ease",
        }}
        onMouseEnter={(e) => {
          if (!state.loading) {
            const bg = state.downloaded ? "#059669" : brand.royal;
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = bg;
          }
        }}
        onMouseLeave={(e) => {
          const bg = state.downloaded ? "#10B981" : brand.azure;
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = bg;
        }}
      >
        {state.loading
          ? "Generating..."
          : state.downloaded
            ? "Download Again"
            : "Pre-Fill & Download"}
      </button>
    </div>
  );
}
