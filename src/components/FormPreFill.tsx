"use client";

import { useState } from "react";
import type { DD214Data, QuestionnaireData } from "@/lib/rules-engine";
import { fillVAForm, PDF_FILES } from "@/lib/pdf-filler";

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
  filled: boolean;
  filledCount?: number;
  totalFields?: number;
  error?: string;
}

// ─── COMPONENT ──────────────────────────────────────────────────────────

export default function FormPreFill({
  dd214,
  questionnaire,
  recommendedForms,
}: FormPreFillProps) {
  const [formStates, setFormStates] = useState<Record<string, FormState>>({});

  // Extract form number from "VA Form 21-526EZ" -> "21-526EZ"
  const stripFormPrefix = (form: string): string => {
    return form.replace(/^VA Form\s+/, "");
  };

  // Check if a form has PDF auto-fill support
  const hasPdfSupport = (form: string): boolean => {
    const formNumber = stripFormPrefix(form);
    return formNumber in PDF_FILES;
  };

  // Fill a VA form and open it in a new tab
  const handleFillAndOpen = async (formData: (typeof recommendedForms)[0]) => {
    const formId = formData.form;
    const formNumber = stripFormPrefix(formData.form);

    setFormStates((prev) => ({
      ...prev,
      [formId]: { loading: true, filled: false },
    }));

    try {
      const result = await fillVAForm(formNumber, dd214, questionnaire);

      // Create blob and open in new tab
      const blob = new Blob([new Uint8Array(result.pdfBytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");

      // Also trigger a download as backup
      const link = document.createElement("a");
      link.href = url;
      link.download = `VA_Form_${formNumber}_Filled.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setFormStates((prev) => ({
        ...prev,
        [formId]: {
          loading: false,
          filled: true,
          filledCount: result.filledCount,
          totalFields: result.totalFields,
        },
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fill form";
      setFormStates((prev) => ({
        ...prev,
        [formId]: { loading: false, filled: false, error: errorMessage },
      }));
    }
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
          📋 Auto-Fill Your VA Forms
        </h2>
        <p
          style={{
            fontSize: "14px",
            color: "#6B7280",
            margin: "0",
          }}
        >
          Click to fill the actual VA form with your DD-214 data — opens
          pre-filled in your browser
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
            state={
              formStates[formData.form] || { loading: false, filled: false }
            }
            onFillAndOpen={() => handleFillAndOpen(formData)}
            pdfSupported={hasPdfSupport(formData.form)}
          />
        ))}
      </div>

      {/* Info Note */}
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
          <strong>How it works:</strong> VetsPath fills the official VA form
          PDF with your DD-214 data. Review the form, make any edits, then
          submit online at{" "}
          <a
            href="https://www.va.gov/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#1565C0", textDecoration: "underline" }}
          >
            VA.gov
          </a>{" "}
          or print and mail.
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
  onFillAndOpen: () => void;
  pdfSupported: boolean;
}

function FormCard({ formData, state, onFillAndOpen, pdfSupported }: FormCardProps) {
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

      {/* Fill Result */}
      {state.filled && state.filledCount !== undefined && (
        <div
          style={{
            backgroundColor: "#F0FDF4",
            padding: "12px",
            borderRadius: "6px",
            fontSize: "12px",
            color: "#166534",
          }}
        >
          <strong>✓ {state.filledCount} fields auto-filled</strong> — form
          opened in new tab
        </div>
      )}

      {/* Error */}
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
      {pdfSupported ? (
        <button
          onClick={onFillAndOpen}
          disabled={state.loading}
          style={{
            backgroundColor: state.filled ? "#10B981" : brand.azure,
            color: brand.white,
            border: "none",
            padding: "12px 16px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: state.loading ? "not-allowed" : "pointer",
            opacity: state.loading ? 0.7 : 1,
            transition: "background-color 0.2s ease",
          }}
          onMouseEnter={(e) => {
            if (!state.loading) {
              const bg = state.filled ? "#059669" : brand.royal;
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = bg;
            }
          }}
          onMouseLeave={(e) => {
            const bg = state.filled ? "#10B981" : brand.azure;
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = bg;
          }}
        >
          {state.loading
            ? "Filling Form..."
            : state.filled
              ? "Open Again"
              : "Fill & Open Form →"}
        </button>
      ) : (
        <a
          href={`https://www.va.gov/find-forms/about-form-${formData.form.replace(/^VA Form\s+/, "").toLowerCase()}/`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            backgroundColor: brand.midnight,
            color: brand.white,
            border: "none",
            padding: "12px 16px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "600",
            textAlign: "center",
            textDecoration: "none",
            transition: "background-color 0.2s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.backgroundColor = brand.royal;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.backgroundColor = brand.midnight;
          }}
        >
          View on VA.gov →
        </a>
      )}
    </div>
  );
}
