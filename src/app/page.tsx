"use client";

import { useState, useCallback } from "react";
import {
  evaluateEligibility,
  MOS_DESCRIPTIONS,
  PRESUMPTIVE_CONDITIONS,
  PRIORITY_GROUPS,
  type DD214Data,
  type QuestionnaireData,
  type EligibilityResults,
  type BenefitResult,
} from "@/lib/rules-engine";
import PROFILES from "@/data/profiles";
import DocumentUpload from "@/components/DocumentUpload";
import DynamicQuestionnaire from "@/components/DynamicQuestionnaire";
import type { UploadedDocument } from "@/lib/ocr-pipeline";

// ─── AQUIA BRAND INLINE STYLES ──────────────────────────────────────────
// Using inline styles for brand colors to ensure they work without Tailwind JIT

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

// ─── STEP INDICATOR ─────────────────────────────────────────────────────

const STEPS = ["Veteran Information", "Benefits Assessment", "Your Benefits", "Forms & Documents"];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <nav aria-label="Progress" className="flex items-center justify-center mb-8" style={{ flexWrap: 'nowrap' }}>
      {STEPS.map((step, i) => (
        <div key={i} className="flex items-center" style={{ flexShrink: 0 }}>
          <div
            className="flex items-center justify-center rounded-full font-bold"
            role="status"
            aria-label={`Step ${i + 1}: ${step}${i < currentStep ? ', completed' : i === currentStep ? ', current' : ''}`}
            aria-current={i === currentStep ? "step" : undefined}
            style={{
              width: '28px',
              height: '28px',
              fontSize: '12px',
              backgroundColor: i < currentStep ? brand.azure : i === currentStep ? brand.royal : brand.silver,
              color: i < currentStep || i === currentStep ? "#fff" : brand.midnight,
              outline: i === currentStep ? `3px solid ${brand.midnight}` : 'none',
              outlineOffset: '2px',
            }}
          >
            {i < currentStep ? "\u2713" : i + 1}
          </div>
          <span
            className="ml-1 hidden sm:inline"
            style={{
              color: i === currentStep ? brand.royal : brand.silver,
              fontWeight: i === currentStep ? 600 : 400,
              fontSize: '11px',
              whiteSpace: 'nowrap',
            }}
          >
            {step}
          </span>
          {i < STEPS.length - 1 && (
            <div className="h-0.5 mx-1 sm:mx-2" aria-hidden="true" style={{ backgroundColor: brand.silver, width: '20px' }} />
          )}
        </div>
      ))}
    </nav>
  );
}

// ─── STEP 1: DD-214 FORM ────────────────────────────────────────────────

function DD214Form({
  data, onChange, onSubmit,
}: {
  data: Partial<DD214Data>;
  onChange: (d: Partial<DD214Data>) => void;
  onSubmit: () => void;
}) {
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [hasExtracted, setHasExtracted] = useState(false);

  const set = (field: string, value: string) => onChange({ ...data, [field]: value });
  const mosCode = data.mos?.split(/[\s\u2014-]/)[0]?.trim() || "";

  const handleFieldsExtracted = useCallback((fields: Partial<DD214Data>) => {
    // Merge extracted fields into existing data (don't overwrite user edits)
    const merged = { ...data };
    for (const [key, value] of Object.entries(fields)) {
      if (value && !merged[key as keyof DD214Data]) {
        (merged as Record<string, unknown>)[key] = value;
      }
    }
    onChange(merged);
    setHasExtracted(true);
  }, [data, onChange]);

  const handleDocumentsProcessed = useCallback((docs: UploadedDocument[]) => {
    setUploadedDocs(docs);
  }, []);

  return (
    <main className="max-w-2xl mx-auto" id="main-content">
      {/* Document Upload Section */}
      <DocumentUpload
        onFieldsExtracted={handleFieldsExtracted}
        onDocumentsProcessed={handleDocumentsProcessed}
      />

      {/* Info Banner */}
      <div className="p-4 mb-6 rounded-lg" role="status" aria-live="polite" style={{ backgroundColor: brand.ice, borderLeft: `4px solid ${brand.royal}` }}>
        <h2 className="font-semibold mb-1" style={{ color: brand.midnight }}>
          {hasExtracted ? "Review Your Extracted DD-214 Information" : "Enter Your DD-214 Information"}
        </h2>
        <p className="text-sm" style={{ color: brand.royal }}>
          {hasExtracted
            ? "We\u2019ve auto-filled fields from your uploaded document. Please review and correct any errors below."
            : "Upload your DD-214 above to auto-fill these fields, or enter the key information manually from your discharge document."}
        </p>
      </div>

      <fieldset>
        <legend className="sr-only">DD-214 Information</legend>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="full-name" className="block text-sm font-medium mb-1" style={{ color: brand.midnight }}>Full Name (Block 1) <span aria-label="required">*</span></label>
              <input type="text" id="full-name" className="w-full rounded-lg p-2.5 text-sm focus:outline-2 focus:outline-offset-0" placeholder="e.g., Smith, John A."
                style={{ border: `1px solid ${brand.silver}`, outlineColor: brand.azure }}
                value={data.name || ""} onChange={e => set("name", e.target.value)} />
            </div>
            <div>
              <label htmlFor="branch" className="block text-sm font-medium mb-1" style={{ color: brand.midnight }}>Branch of Service (Block 2) <span aria-label="required">*</span></label>
              <select id="branch" className="w-full rounded-lg p-2.5 text-sm bg-white focus:outline-2 focus:outline-offset-0"
                style={{ border: `1px solid ${brand.silver}`, outlineColor: brand.azure }}
                value={data.branch || ""} onChange={e => set("branch", e.target.value)}>
                <option value="">Select branch...</option>
                <option>Army</option><option>Navy</option><option>Air Force</option>
                <option>Marine Corps</option><option>Coast Guard</option><option>Space Force</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="mos" className="block text-sm font-medium mb-1" style={{ color: brand.midnight }}>MOS / Rating / AFSC (Block 11)</label>
              <input type="text" id="mos" className="w-full rounded-lg p-2.5 text-sm focus:outline-2 focus:outline-offset-0" placeholder="e.g., 11B, 68W, 0311"
                style={{ border: `1px solid ${brand.silver}`, outlineColor: brand.azure }}
                value={data.mos || ""} onChange={e => set("mos", e.target.value)} />
              {mosCode && MOS_DESCRIPTIONS[mosCode] && (
                <p className="text-xs mt-1" style={{ color: brand.azure }}>{MOS_DESCRIPTIONS[mosCode]}</p>
              )}
            </div>
            <div>
              <label htmlFor="rank" className="block text-sm font-medium mb-1" style={{ color: brand.midnight }}>Rank at Separation (Block 4a)</label>
              <input type="text" id="rank" className="w-full rounded-lg p-2.5 text-sm focus:outline-2 focus:outline-offset-0" placeholder="e.g., E-5 / SGT"
                style={{ border: `1px solid ${brand.silver}`, outlineColor: brand.azure }}
                value={data.rank || ""} onChange={e => set("rank", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="date-entered" className="block text-sm font-medium mb-1" style={{ color: brand.midnight }}>Date Entered Active Duty (Block 12a) <span aria-label="required">*</span></label>
              <input type="date" id="date-entered" className="w-full rounded-lg p-2.5 text-sm focus:outline-2 focus:outline-offset-0"
                style={{ border: `1px solid ${brand.silver}`, outlineColor: brand.azure }}
                value={data.enteredActiveDuty || ""} onChange={e => set("enteredActiveDuty", e.target.value)} />
            </div>
            <div>
              <label htmlFor="date-separated" className="block text-sm font-medium mb-1" style={{ color: brand.midnight }}>Separation Date (Block 12b) <span aria-label="required">*</span></label>
              <input type="date" id="date-separated" className="w-full rounded-lg p-2.5 text-sm focus:outline-2 focus:outline-offset-0"
                style={{ border: `1px solid ${brand.silver}`, outlineColor: brand.azure }}
                value={data.separationDate || ""} onChange={e => set("separationDate", e.target.value)} />
            </div>
          </div>

          <div>
            <label htmlFor="discharge-type" className="block text-sm font-medium mb-1" style={{ color: brand.midnight }}>Character of Service (Block 24) <span aria-label="required">*</span></label>
            <select id="discharge-type" className="w-full rounded-lg p-2.5 text-sm bg-white focus:outline-2 focus:outline-offset-0"
              style={{ border: `1px solid ${brand.silver}`, outlineColor: brand.azure }}
              value={data.characterOfDischarge || ""} onChange={e => set("characterOfDischarge", e.target.value)}>
              <option value="">Select discharge type...</option>
              <option>Honorable</option>
              <option>General (Under Honorable Conditions)</option>
              <option>Other Than Honorable</option>
              <option>Bad Conduct</option>
              <option>Dishonorable</option>
            </select>
          </div>

          <div>
            <label htmlFor="decorations" className="block text-sm font-medium mb-1" style={{ color: brand.midnight }}>Decorations, Medals, Badges (Block 13)</label>
            <textarea id="decorations" className="w-full rounded-lg p-2.5 text-sm focus:outline-2 focus:outline-offset-0" rows={2}
              placeholder="e.g., Purple Heart, Bronze Star, Army Commendation Medal, Iraq Campaign Medal..."
              style={{ border: `1px solid ${brand.silver}`, outlineColor: brand.azure }}
              value={data.decorations || ""} onChange={e => set("decorations", e.target.value)} />
          </div>

          <div>
            <label htmlFor="duty-locations" className="block text-sm font-medium mb-1" style={{ color: brand.midnight }}>Last Duty Assignment / Locations (Block 8a)</label>
            <input type="text" id="duty-locations" className="w-full rounded-lg p-2.5 text-sm focus:outline-2 focus:outline-offset-0"
              placeholder="e.g., 3rd BCT, 101st Airborne / Deployed to Iraq, Afghanistan"
              style={{ border: `1px solid ${brand.silver}`, outlineColor: brand.azure }}
              value={data.dutyLocations || ""} onChange={e => set("dutyLocations", e.target.value)} />
          </div>

          <div>
            <label htmlFor="remarks" className="block text-sm font-medium mb-1" style={{ color: brand.midnight }}>Remarks (Block 18)</label>
            <textarea id="remarks" className="w-full rounded-lg p-2.5 text-sm focus:outline-2 focus:outline-offset-0" rows={2}
              placeholder="e.g., Served in OIF III. Exposure to burn pits documented."
              style={{ border: `1px solid ${brand.silver}`, outlineColor: brand.azure }}
              value={data.remarks || ""} onChange={e => set("remarks", e.target.value)} />
          </div>

          <div>
            <label htmlFor="narrative-reason" className="block text-sm font-medium mb-1" style={{ color: brand.midnight }}>Narrative Reason for Separation (Block 28)</label>
            <input type="text" id="narrative-reason" className="w-full rounded-lg p-2.5 text-sm focus:outline-2 focus:outline-offset-0"
              placeholder="e.g., Completion of Required Active Service, Disability..."
              style={{ border: `1px solid ${brand.silver}`, outlineColor: brand.azure }}
              value={data.narrativeReason || ""} onChange={e => set("narrativeReason", e.target.value)} />
          </div>
        </div>
      </fieldset>

      <button onClick={onSubmit}
        disabled={!data.characterOfDischarge || !data.enteredActiveDuty || !data.separationDate}
        className="mt-6 w-full text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-2 focus:outline-offset-0"
        style={{
          backgroundColor: data.characterOfDischarge && data.enteredActiveDuty && data.separationDate ? brand.royal : brand.silver,
          outlineColor: brand.azure,
        }}>
        Continue to Questions &rarr;
      </button>
    </main>
  );
}


// ─── STEP 3: RESULTS DASHBOARD ──────────────────────────────────────────

function BenefitCard({
  title, icon, result, accentColor,
}: {
  title: string; icon: string; result: BenefitResult; accentColor: string;
}) {
  return (
    <article className="rounded-xl p-5 mb-4" style={{
      border: `2px solid ${result.eligible ? accentColor : brand.silver}`,
      backgroundColor: result.eligible ? brand.ice : brand.offwhite,
    }}>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-2xl" aria-hidden="true">{icon}</span>
        <h3 className="text-lg font-bold" style={{ color: brand.midnight }}>{title}</h3>
        <span className="ml-auto px-3 py-1 rounded-full text-xs font-bold" style={{
          backgroundColor: result.eligible ? brand.ice : "#fde8e8",
          color: result.eligible ? brand.azure : brand.orange,
          border: `1px solid ${result.eligible ? brand.azure : brand.orange}`,
        }} aria-label={result.eligible ? "Likely eligible" : "Not eligible"}>
          {result.eligible ? "LIKELY ELIGIBLE" : "NOT ELIGIBLE"}
        </span>
      </div>

      {result.details.map((d, i) => (
        <p key={i} className="text-sm mb-1" style={{ color: brand.midnight, opacity: 0.85 }}>{d}</p>
      ))}

      {result.presumptiveConditions && result.presumptiveConditions.length > 0 && (
        <div className="mt-3 rounded-lg p-3" style={{ backgroundColor: brand.white, border: `1px solid ${brand.sky}` }}>
          <h4 className="text-sm font-semibold mb-2" style={{ color: brand.royal }}>
            Presumptive Conditions — No Nexus Letter Needed
          </h4>
          {result.presumptiveConditions.map((pc, i) => (
            <div key={i} className="mb-2 last:mb-0">
              <p className="text-xs font-semibold" style={{ color: brand.azure }}>{pc.category}</p>
              <p className="text-xs italic mb-1" style={{ color: brand.royal, opacity: 0.7 }}>{pc.reason}</p>
              <p className="text-xs" style={{ color: brand.midnight }}>Conditions: {pc.conditions.join(", ")}</p>
            </div>
          ))}
        </div>
      )}

      {result.priorityGroup && (
        <div className="mt-2 inline-block text-xs font-semibold px-2 py-1 rounded"
          style={{ backgroundColor: brand.ice, color: brand.azure }}>
          Priority Group {result.priorityGroup}
        </div>
      )}

      {result.tier && (
        <div className="mt-2 ml-2 inline-block text-xs font-semibold px-2 py-1 rounded"
          style={{ backgroundColor: brand.ice, color: brand.royal }}>
          {result.tier.percentage}% Benefit Level
        </div>
      )}
    </article>
  );
}

function ResultsDashboard({
  results, onNext, onBack,
}: {
  results: EligibilityResults; onNext: () => void; onBack: () => void;
}) {
  return (
    <main className="max-w-3xl mx-auto" id="main-content">
      {results.warnings.length > 0 && (
        <div className="p-4 mb-6 rounded-lg" role="alert" style={{ backgroundColor: "#fff5f5", borderLeft: `4px solid ${brand.orange}` }}>
          <h2 className="font-semibold mb-2 sr-only">Warnings</h2>
          {results.warnings.map((w, i) => <p key={i} className="text-sm" style={{ color: brand.orange }}>{w}</p>)}
        </div>
      )}

      {results.recommendations.length > 0 && (
        <div className="p-4 mb-6 rounded-lg" style={{ backgroundColor: brand.ice, borderLeft: `4px solid ${brand.azure}` }}>
          <h2 className="font-semibold mb-2" style={{ color: brand.midnight }}>Key Recommendations</h2>
          {results.recommendations.map((r, i) => (
            <p key={i} className="text-sm mb-1" style={{ color: brand.royal }}>
              {i === 0 && "\u26A1 "}{r}
            </p>
          ))}
        </div>
      )}

      <BenefitCard title="Disability Compensation" icon="&#127973;" result={results.disabilityComp} accentColor={brand.azure} />
      <BenefitCard title="VA Healthcare" icon="&#128138;" result={results.healthcare} accentColor={brand.sky} />
      <BenefitCard title="Education Benefits (GI Bill)" icon="&#127891;" result={results.education} accentColor={brand.royal} />
      <BenefitCard title="VA Home Loan" icon="&#127968;" result={results.homeLoan} accentColor={brand.azure} />
      <BenefitCard title="Vocational Rehabilitation" icon="&#128187;" result={results.vocRehab} accentColor={brand.royal} />
      <BenefitCard title="Aid & Attendance" icon="&#127998;" result={results.aidAttendance} accentColor={brand.sky} />
      <BenefitCard title="Secondary Conditions" icon="&#128279;" result={results.secondaryConditions} accentColor={brand.midnight} />

      <div className="flex gap-3 mt-6">
        <button onClick={onBack} className="px-6 py-3 rounded-lg font-medium focus:outline-2 focus:outline-offset-0"
          style={{ border: `1px solid ${brand.silver}`, color: brand.midnight, outlineColor: brand.azure }}>
          &larr; Back
        </button>
        <button onClick={onNext} className="flex-1 text-white py-3 rounded-lg font-semibold transition-colors focus:outline-2 focus:outline-offset-0"
          style={{ backgroundColor: brand.royal, outlineColor: brand.azure }}>
          View Forms &amp; Documents &rarr;
        </button>
      </div>
    </main>
  );
}

// ─── STEP 4: FORMS & DOCUMENTS ──────────────────────────────────────────

function FormsAndDocs({ results, onBack }: { results: EligibilityResults; onBack: () => void }) {
  const allForms = [
    ...results.disabilityComp.forms.map(f => ({ ...f, benefit: "Disability Compensation" })),
    ...results.healthcare.forms.map(f => ({ ...f, benefit: "Healthcare" })),
    ...results.education.forms.map(f => ({ ...f, benefit: "Education" })),
    ...results.homeLoan.forms.map(f => ({ ...f, benefit: "Home Loan" })),
    ...results.vocRehab.forms.map(f => ({ ...f, benefit: "Vocational Rehab" })),
    ...results.aidAttendance.forms.map(f => ({ ...f, benefit: "Aid & Attendance" })),
    ...results.secondaryConditions.forms.map(f => ({ ...f, benefit: "Secondary Conditions" })),
  ];

  const allDocs = [...new Set([
    ...results.disabilityComp.docs,
    ...results.healthcare.docs,
    ...results.education.docs,
    ...results.homeLoan.docs,
    ...results.vocRehab.docs,
    ...results.aidAttendance.docs,
    ...results.secondaryConditions.docs,
  ])];

  const priorityLabels: Record<string, string> = {
    critical: "FILE FIRST", primary: "Required", conditional: "If Applicable"
  };
  const priorityStyles: Record<string, { bg: string; color: string; border: string }> = {
    critical: { bg: "#fff5f0", color: brand.orange, border: brand.orange },
    primary: { bg: brand.ice, color: brand.azure, border: brand.azure },
    conditional: { bg: brand.offwhite, color: brand.midnight, border: brand.silver },
  };

  return (
    <main className="max-w-3xl mx-auto" id="main-content">
      <div className="p-4 mb-6 rounded-lg" style={{ backgroundColor: brand.ice, borderLeft: `4px solid ${brand.royal}` }}>
        <h2 className="font-semibold mb-1" style={{ color: brand.midnight }}>Your Personalized Forms Package</h2>
        <p className="text-sm" style={{ color: brand.royal }}>
          Based on your eligibility analysis, here are the forms you need and the documents to gather.
          In the full version, we&apos;ll pre-fill these forms for you.
        </p>
      </div>

      <section>
        <h3 className="text-lg font-bold mb-3" style={{ color: brand.midnight }}>Forms to File</h3>
        <div className="space-y-3 mb-8">
          {allForms.map((f, i) => {
            const ps = priorityStyles[f.priority];
            return (
              <div key={i} className="rounded-lg p-4 flex flex-col sm:flex-row sm:items-start gap-3"
                style={{ backgroundColor: brand.white, border: `1px solid ${brand.silver}` }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold" style={{ color: brand.midnight }}>{f.form}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded"
                      style={{ backgroundColor: ps.bg, color: ps.color, border: `1px solid ${ps.border}` }}>
                      {priorityLabels[f.priority]}
                    </span>
                    <span className="text-xs" style={{ color: brand.silver }}>({f.benefit})</span>
                  </div>
                  <p className="text-sm font-medium mt-1" style={{ color: brand.midnight }}>{f.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: brand.royal, opacity: 0.7 }}>{f.reason}</p>
                </div>
                <a href={`https://www.va.gov/find-forms/about-form-${f.form.replace("VA Form ", "").toLowerCase()}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-white px-3 py-1.5 rounded font-medium whitespace-nowrap self-start focus:outline-2 focus:outline-offset-0"
                  style={{ backgroundColor: brand.azure, outlineColor: brand.midnight }}>
                  View on VA.gov
                </a>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-bold mb-3" style={{ color: brand.midnight }}>Documents to Gather</h3>
        <fieldset className="rounded-lg p-4 mb-6" style={{ backgroundColor: brand.white, border: `1px solid ${brand.silver}` }}>
          <legend className="sr-only">Documents checklist</legend>
          {allDocs.map((doc, i) => (
            <label key={i} className="flex items-start gap-3 mb-3 cursor-pointer last:mb-0">
              <input type="checkbox" className="mt-0.5 w-4 h-4 focus:outline-2 focus:outline-offset-0" style={{ accentColor: brand.azure, outlineColor: brand.azure }} />
              <span className="text-sm" style={{ color: brand.midnight }}>{doc}</span>
            </label>
          ))}
        </fieldset>
      </section>

      <section className="rounded-lg p-5 mb-6" style={{ backgroundColor: brand.ice, border: `1px solid ${brand.sky}` }}>
        <h3 className="font-bold mb-3" style={{ color: brand.midnight }}>Recommended Next Steps</h3>
        <ol className="space-y-2 text-sm" style={{ color: brand.midnight }}>
          <li className="flex gap-2">
            <span className="font-bold shrink-0" style={{ color: brand.azure }}>1.</span>
            File your Intent to File (VA Form 21-0966) immediately — online at VA.gov or call 800-827-1000.
          </li>
          <li className="flex gap-2">
            <span className="font-bold shrink-0" style={{ color: brand.azure }}>2.</span>
            Gather all documents on the checklist above.
          </li>
          <li className="flex gap-2">
            <span className="font-bold shrink-0" style={{ color: brand.azure }}>3.</span>
            Connect with a free Veterans Service Organization (VSO) — DAV, VFW, or American Legion can help at no cost.
          </li>
          <li className="flex gap-2">
            <span className="font-bold shrink-0" style={{ color: brand.azure }}>4.</span>
            Complete and submit your primary applications within 1 year of your Intent to File date.
          </li>
          <li className="flex gap-2">
            <span className="font-bold shrink-0" style={{ color: brand.azure }}>5.</span>
            Prepare for your C&amp;P exam — document your worst days, bring evidence, be thorough about daily life impact.
          </li>
        </ol>
      </section>

      <button onClick={onBack} className="px-6 py-3 rounded-lg font-medium focus:outline-2 focus:outline-offset-0"
        style={{ border: `1px solid ${brand.silver}`, color: brand.midnight, outlineColor: brand.azure }}>
        &larr; Back to Results
      </button>
    </main>
  );
}

// ─── VA LOGO COMPONENT ─────────────────────────────────────────────────

function VALogo() {
  return (
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Seal_of_the_U.S._Department_of_Veterans_Affairs.svg/200px-Seal_of_the_U.S._Department_of_Veterans_Affairs.svg.png"
      alt="U.S. Department of Veterans Affairs Seal"
      width={44}
      height={44}
      style={{ borderRadius: '50%' }}
    />
  );
}

// ─── AQUIA LOGO COMPONENT ───────────────────────────────────────────────

function AquiaLogo() {
  return (
    <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="100" height="100" rx="8" fill={brand.royal} />
      <rect x="8" y="8" width="84" height="84" rx="2" stroke="white" strokeWidth="3" fill="none" />
      <text x="50" y="68" textAnchor="middle" fontFamily="Poppins, sans-serif" fontSize="48" fontWeight="600" fill="white">Aq</text>
    </svg>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────

export default function Home() {
  const [step, setStep] = useState(0);
  const [dd214, setDD214] = useState<Partial<DD214Data>>({});
  const [questionnaire, setQuestionnaire] = useState<Partial<QuestionnaireData>>({ conditions: [""] });
  const [results, setResults] = useState<EligibilityResults | null>(null);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);

  const handleDD214Submit = useCallback(() => setStep(1), []);
  const handleQuestionnaireSubmit = useCallback(() => {
    const r = evaluateEligibility(dd214 as DD214Data, questionnaire);
    setResults(r);
    setStep(2);
  }, [dd214, questionnaire]);

  const loadProfile = useCallback((profileId: string) => {
    const profile = PROFILES.find(p => p.id === profileId);
    if (!profile) return;
    setDD214(profile.dd214 as Partial<DD214Data>);
    setQuestionnaire(profile.questionnaire as Partial<QuestionnaireData>);
    setActiveProfile(profileId);
    setStep(0);
    setResults(null);
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: brand.offwhite, fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <header style={{ backgroundColor: brand.white, borderBottom: `1px solid ${brand.silver}`, boxShadow: '0 1px 3px rgba(3,9,64,0.06)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 sm:py-5">
          <div className="flex items-center gap-3">
            <VALogo />
            <AquiaLogo />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold" style={{ color: brand.midnight }}>VetsPath</h1>
              <p className="text-xs sm:text-sm" style={{ color: brand.azure }}>Your VA Benefits Navigator</p>
            </div>
            {PROFILES.length > 0 && (
              <select
                className="ml-auto text-xs rounded px-2 py-1.5 font-medium focus:outline-2 focus:outline-offset-0"
                style={{ border: `1px solid ${brand.silver}`, color: brand.midnight, backgroundColor: brand.white, maxWidth: 220, outlineColor: brand.azure }}
                value={activeProfile || ""}
                onChange={e => e.target.value && loadProfile(e.target.value)}
                aria-label="Load test profile"
              >
                <option value="">Load test profile...</option>
                {PROFILES.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            )}
            <div className="text-xs font-medium px-2 py-1 rounded shrink-0" style={{ backgroundColor: brand.ice, color: brand.royal }}>
              by Aquia
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <StepIndicator currentStep={step} />

        {step === 0 && <DD214Form data={dd214} onChange={setDD214} onSubmit={handleDD214Submit} />}
        {step === 1 && (
          <DynamicQuestionnaire dd214={dd214} data={questionnaire} onChange={setQuestionnaire}
            onSubmit={handleQuestionnaireSubmit} onBack={() => setStep(0)} />
        )}
        {step === 2 && results && (
          <ResultsDashboard results={results} onNext={() => setStep(3)} onBack={() => setStep(1)} />
        )}
        {step === 3 && results && <FormsAndDocs results={results} onBack={() => setStep(2)} />}
      </div>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${brand.silver}`, backgroundColor: brand.white }} className="mt-8">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center">
          <p className="text-xs" style={{ color: brand.silver }}>
            VetsPath is an informational tool and does not constitute legal or medical advice.
            Always verify eligibility with the VA or a Veterans Service Organization.
          </p>
        </div>
      </footer>
    </div>
  );
}
