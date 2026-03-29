"use client";

import { useState, useCallback } from "react";
import {
  SECONDARY_CONDITION_PAIRS,
  PRESUMPTIVE_CONDITIONS,
  MOS_DESCRIPTIONS,
  detectSecondaryConditions,
  type DD214Data,
  type QuestionnaireData,
} from "@/lib/rules-engine";

// ─── AQUIA BRAND COLORS ──────────────────────────────────────────────────

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

// ─── TYPES ──────────────────────────────────────────────────────────────

interface Module {
  id: string;
  title: string;
  description: string;
  triggerCondition: (dd214: Partial<DD214Data>, data: Partial<QuestionnaireData>) => boolean;
  render: (data: Partial<QuestionnaireData>, onChange: (d: Partial<QuestionnaireData>) => void, dd214: Partial<DD214Data>) => React.ReactNode;
}

interface DynamicQuestionnaireProps {
  dd214: Partial<DD214Data>;
  data: Partial<QuestionnaireData>;
  onChange: (d: Partial<QuestionnaireData>) => void;
  onSubmit: () => void;
  onBack: () => void;
}

// ─── MODULE DEFINITIONS ──────────────────────────────────────────────────

const MODULES: Module[] = [
  // 1. HEALTH CONDITIONS (ALWAYS SHOWN)
  {
    id: "health-conditions",
    title: "Current Health Conditions",
    description: "List any conditions you believe may be related to your service.",
    triggerCondition: () => true,
    render: (data, onChange, dd214) => {
      const conditions = data.conditions || [""];
      const handleConditionChange = (index: number, value: string) => {
        const updated = [...conditions];
        updated[index] = value;
        onChange({ ...data, conditions: updated });
      };
      const addCondition = () => onChange({ ...data, conditions: [...conditions, ""] });

      // Check for secondary condition matches
      const filledConditions = conditions.filter(c => c.trim());
      const detectedSecondaries = detectSecondaryConditions(filledConditions);

      return (
        <div>
          <fieldset>
            <legend className="sr-only">Health conditions</legend>
            <div className="space-y-2 mb-4">
              {conditions.map((cond, i) => (
                <input
                  key={i}
                  type="text"
                  className="w-full rounded-lg p-2.5 text-sm focus:outline-2 focus:outline-offset-0"
                  placeholder={i === 0 ? "e.g., Lower back pain, tinnitus, PTSD..." : "Add another condition..."}
                  style={{ border: `1px solid ${brand.silver}`, outlineColor: brand.azure }}
                  value={cond}
                  onChange={e => handleConditionChange(i, e.target.value)}
                  aria-label={`Condition ${i + 1}`}
                />
              ))}
              <button
                onClick={addCondition}
                className="text-sm font-medium focus:outline-2 focus:outline-offset-0"
                style={{ color: brand.azure, outlineColor: brand.azure }}
              >
                + Add another condition
              </button>
            </div>
          </fieldset>

          {detectedSecondaries.length > 0 && (
            <div className="p-3 rounded-lg mb-4" role="status" aria-live="polite" style={{ backgroundColor: brand.ice, borderLeft: `4px solid ${brand.sky}` }}>
              <p className="text-xs font-semibold mb-2" style={{ color: brand.royal }}>
                Secondary Conditions Detected
              </p>
              <p className="text-xs" style={{ color: brand.midnight }}>
                We detected potential secondary conditions based on your primary conditions. You'll see these in the next module.
              </p>
            </div>
          )}
        </div>
      );
    },
  },

  // 2. COMBAT & MENTAL HEALTH
  {
    id: "combat-mental-health",
    title: "Combat & Mental Health",
    description: "Your service record indicates potential combat exposure.",
    triggerCondition: (dd214) => {
      const locations = ((dd214.dutyLocations || "") + " " + (dd214.remarks || "")).toLowerCase();
      const decorations = (dd214.decorations || "").toLowerCase();
      const hasCombat = /iraq|afghanistan|vietnam|combat|deployed|theater/i.test(locations);
      const hasCombatDecoration = decorations.includes("combat action") ||
        decorations.includes("combat infantry") ||
        decorations.includes("bronze star") ||
        decorations.includes("purple heart");
      return hasCombat || hasCombatDecoration;
    },
    render: (data, onChange) => {
      const checkboxLabelClass = "flex items-start gap-3 mb-3 cursor-pointer last:mb-0";
      return (
        <fieldset>
          <legend className="sr-only">Combat and mental health</legend>
          <div className="space-y-3">
            <label className={checkboxLabelClass}>
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 focus:outline-2 focus:outline-offset-0"
                style={{ accentColor: brand.azure, outlineColor: brand.azure }}
                checked={!!data.hasPTSD}
                onChange={e => onChange({ ...data, hasPTSD: e.target.checked })}
              />
              <span className="text-sm" style={{ color: brand.midnight }}>
                I experience symptoms of PTSD, anxiety, depression, or other mental health conditions related to my service
              </span>
            </label>
            <label className={checkboxLabelClass}>
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 focus:outline-2 focus:outline-offset-0"
                style={{ accentColor: brand.azure, outlineColor: brand.azure }}
                checked={!!data.hasTBI}
                onChange={e => onChange({ ...data, hasTBI: e.target.checked })}
              />
              <span className="text-sm" style={{ color: brand.midnight }}>
                I experienced a traumatic brain injury (TBI) or blast exposure during service
              </span>
            </label>
          </div>
        </fieldset>
      );
    },
  },

  // 3. HEARING & NOISE EXPOSURE
  {
    id: "hearing-noise",
    title: "Hearing & Noise Exposure",
    description: "Your MOS typically involves significant noise exposure.",
    triggerCondition: (dd214) => {
      const mos = dd214.mos?.split(/[\s\u2014-]/)[0]?.trim() || "";
      return PRESUMPTIVE_CONDITIONS.noiseExposure.triggerMOS?.includes(mos) || false;
    },
    render: (data, onChange, dd214) => {
      const mos = dd214.mos?.split(/[\s\u2014-]/)[0]?.trim() || "";
      const checkboxLabelClass = "flex items-start gap-3 mb-3 cursor-pointer last:mb-0";
      return (
        <div>
          <p className="text-sm mb-3" style={{ color: brand.royal, opacity: 0.8 }}>
            Your MOS ({mos} — {MOS_DESCRIPTIONS[mos] || "military specialty"}) typically involves occupational noise exposure.
          </p>
          <fieldset>
            <legend className="sr-only">Hearing and noise exposure</legend>
            <div className="space-y-3">
              <label className={checkboxLabelClass}>
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 focus:outline-2 focus:outline-offset-0"
                  style={{ accentColor: brand.azure, outlineColor: brand.azure }}
                  checked={!!data.hasTinnitus}
                  onChange={e => onChange({ ...data, hasTinnitus: e.target.checked })}
                />
                <span className="text-sm" style={{ color: brand.midnight }}>
                  I experience ringing in my ears (tinnitus)
                </span>
              </label>
              <label className={checkboxLabelClass}>
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 focus:outline-2 focus:outline-offset-0"
                  style={{ accentColor: brand.azure, outlineColor: brand.azure }}
                  checked={!!data.hasHearingLoss}
                  onChange={e => onChange({ ...data, hasHearingLoss: e.target.checked })}
                />
                <span className="text-sm" style={{ color: brand.midnight }}>
                  I have difficulty hearing or have been diagnosed with hearing loss
                </span>
              </label>
            </div>
          </fieldset>
        </div>
      );
    },
  },

  // 4. MILITARY SEXUAL TRAUMA (ALWAYS SHOWN)
  {
    id: "mst",
    title: "Sensitive: Military Sexual Trauma",
    description: "This question is asked in a trauma-informed way. Your response is confidential.",
    triggerCondition: () => true,
    render: (data, onChange) => {
      const mstConditionsList = ["PTSD", "Depression", "Anxiety", "Substance use", "Sleep disorders"];
      const checkboxLabelClass = "flex items-start gap-3 mb-2 cursor-pointer last:mb-0";

      return (
        <fieldset>
          <legend className="sr-only">Military sexual trauma</legend>
          <div className="p-3 rounded-lg mb-4" role="complementary" style={{ backgroundColor: "#fff5f0", borderLeft: `4px solid ${brand.orange}` }}>
            <p className="text-xs" style={{ color: brand.midnight }}>
              The VA does NOT require an official report or documentation from the time of the incident.
              Your own statement, behavioral changes, and fear responses are often sufficient evidence.
            </p>
          </div>

          <label className="flex items-start gap-3 mb-4 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 focus:outline-2 focus:outline-offset-0"
              style={{ accentColor: brand.azure, outlineColor: brand.azure }}
              checked={!!data.experiencedMST}
              onChange={e => onChange({ ...data, experiencedMST: e.target.checked })}
            />
            <span className="text-sm" style={{ color: brand.midnight }}>
              I experienced military sexual trauma (MST) during my service
            </span>
          </label>

          {data.experiencedMST && (
            <div className="p-3 rounded-lg" role="region" aria-live="polite" style={{ backgroundColor: brand.offwhite, border: `1px solid ${brand.silver}` }}>
              <p className="text-xs font-semibold mb-3" style={{ color: brand.royal }}>
                Conditions related to MST (check all that apply):
              </p>
              <div className="space-y-2">
                {mstConditionsList.map(condition => (
                  <label key={condition} className={checkboxLabelClass}>
                    <input
                      type="checkbox"
                      className="mt-0.5 w-4 h-4 focus:outline-2 focus:outline-offset-0"
                      style={{ accentColor: brand.azure, outlineColor: brand.azure }}
                      checked={(data.mstConditions || []).includes(condition)}
                      onChange={e => {
                        const current = data.mstConditions || [];
                        const updated = e.target.checked
                          ? [...current, condition]
                          : current.filter(c => c !== condition);
                        onChange({ ...data, mstConditions: updated });
                      }}
                    />
                    <span className="text-sm" style={{ color: brand.midnight }}>{condition}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </fieldset>
      );
    },
  },

  // 5. EXPOSURES
  {
    id: "exposures",
    title: "Environmental & Occupational Exposures",
    description: "Tell us about any hazardous exposures during your service.",
    triggerCondition: (dd214) => {
      const locations = ((dd214.dutyLocations || "") + " " + (dd214.remarks || "")).toLowerCase();
      return /camp lejeune|mcas new river|iraq|afghanistan|burn pit|radiation|atomic/i.test(locations);
    },
    render: (data, onChange, dd214) => {
      const checkboxLabelClass = "flex items-start gap-3 mb-3 cursor-pointer last:mb-0";
      const locations = ((dd214.dutyLocations || "") + " " + (dd214.remarks || "")).toLowerCase();
      const servedCampLejeune = /camp lejeune|mcas new river/i.test(locations);
      const exposedToRadiation = /radiation|atomic|nevada|pacific|enewetak|japan|greenland/i.test(locations);

      return (
        <fieldset>
          <legend className="sr-only">Environmental and occupational exposures</legend>
          <div className="space-y-3">
            {servedCampLejeune && (
              <label className={checkboxLabelClass}>
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 focus:outline-2 focus:outline-offset-0"
                  style={{ accentColor: brand.azure, outlineColor: brand.azure }}
                  checked={!!data.servedCampLejeune}
                  onChange={e => onChange({ ...data, servedCampLejeune: e.target.checked })}
                />
                <span className="text-sm" style={{ color: brand.midnight }}>
                  I was stationed at Camp Lejeune or MCAS New River between 1953 and 1987
                </span>
              </label>
            )}

            {exposedToRadiation && (
              <label className={checkboxLabelClass}>
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 focus:outline-2 focus:outline-offset-0"
                  style={{ accentColor: brand.azure, outlineColor: brand.azure }}
                  checked={!!data.radiationExposure}
                  onChange={e => onChange({ ...data, radiationExposure: e.target.checked })}
                />
                <span className="text-sm" style={{ color: brand.midnight }}>
                  I was exposed to nuclear radiation (atomic tests, Hiroshima, Enewetak, etc.)
                </span>
              </label>
            )}

            {/iraq|afghanistan|southwest asia|syria|jordan|kuwait|saudi arabia/i.test(locations) && (
              <label className={checkboxLabelClass}>
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 focus:outline-2 focus:outline-offset-0"
                  style={{ accentColor: brand.azure, outlineColor: brand.azure }}
                  checked={!!data.burnPitExposure}
                  onChange={e => onChange({ ...data, burnPitExposure: e.target.checked })}
                />
                <span className="text-sm" style={{ color: brand.midnight }}>
                  I was exposed to burn pits or airborne hazards in Iraq/Afghanistan/Southwest Asia
                </span>
              </label>
            )}

            {!servedCampLejeune && !exposedToRadiation && !/iraq|afghanistan/i.test(locations) && (
              <label className={checkboxLabelClass}>
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 focus:outline-2 focus:outline-offset-0"
                  style={{ accentColor: brand.azure, outlineColor: brand.azure }}
                  checked={!!data.otherExposure}
                  onChange={e => onChange({ ...data, otherExposure: e.target.checked })}
                />
                <span className="text-sm" style={{ color: brand.midnight }}>
                  I experienced other environmental exposures during service
                </span>
              </label>
            )}
          </div>
        </fieldset>
      );
    },
  },

  // 6. SECONDARY CONDITIONS
  {
    id: "secondary-conditions",
    title: "Conditions Caused by Your Service-Connected Disabilities",
    description: "Secondary conditions can qualify for additional compensation.",
    triggerCondition: (dd214, data) => {
      const filledConditions = (data.conditions || []).filter(c => c.trim());
      const detected = detectSecondaryConditions(filledConditions);
      return detected.length > 0;
    },
    render: (data, onChange, dd214) => {
      const filledConditions = (data.conditions || []).filter(c => c.trim());
      const detected = detectSecondaryConditions(filledConditions);

      return (
        <div>
          {detected.length === 0 ? (
            <p className="text-sm" style={{ color: brand.royal }}>
              Based on your conditions, we didn't detect likely secondary conditions. You can still claim any conditions you believe are related.
            </p>
          ) : (
            <div className="space-y-3">
              {detected.map((detection, idx) => {
                const pairInfo = SECONDARY_CONDITION_PAIRS.find(
                  p => p.primary.toLowerCase() === detection.primary.toLowerCase()
                );

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: brand.white, border: `1px solid ${brand.ice}` }}
                  >
                    <h4 className="text-sm font-semibold mb-2" style={{ color: brand.midnight }}>
                      {detection.primary}
                    </h4>
                    {pairInfo && (
                      <p className="text-xs mb-2" style={{ color: brand.royal }}>
                        {pairInfo.explanation}
                      </p>
                    )}
                    <p className="text-xs mb-2 font-medium" style={{ color: brand.azure }}>
                      May lead to:
                    </p>
                    <div className="space-y-1">
                      {detection.secondaries.map(sec => (
                        <label key={sec} className="flex items-start gap-2 cursor-pointer mb-1">
                          <input
                            type="checkbox"
                            className="mt-0.5 w-4 h-4 focus:outline-2 focus:outline-offset-0"
                            style={{ accentColor: brand.azure, outlineColor: brand.azure }}
                            checked={
                              (data.secondaryPairs || []).some(
                                p => p.primary === detection.primary && p.secondary === sec
                              )
                            }
                            onChange={e => {
                              const current = data.secondaryPairs || [];
                              const pair = { primary: detection.primary, secondary: sec };
                              const updated = e.target.checked
                                ? [...current, pair]
                                : current.filter(
                                    p => !(p.primary === detection.primary && p.secondary === sec)
                                  );
                              onChange({ ...data, secondaryPairs: updated, hasSecondaryConditions: updated.length > 0 });
                            }}
                          />
                          <span className="text-sm" style={{ color: brand.midnight }}>{sec}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    },
  },

  // 7. MEDICAL EVIDENCE (ALWAYS SHOWN)
  {
    id: "medical-evidence",
    title: "Medical Records & Treatment",
    description: "Tell us what medical documentation you have available.",
    triggerCondition: () => true,
    render: (data, onChange) => {
      const checkboxLabelClass = "flex items-start gap-3 mb-3 cursor-pointer last:mb-0";

      return (
        <fieldset>
          <legend className="sr-only">Medical records and treatment</legend>
          <div className="space-y-3">
            <label className={checkboxLabelClass}>
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 focus:outline-2 focus:outline-offset-0"
                style={{ accentColor: brand.azure, outlineColor: brand.azure }}
                checked={!!data.hasPrivateMedical}
                onChange={e => onChange({ ...data, hasPrivateMedical: e.target.checked })}
              />
              <span className="text-sm" style={{ color: brand.midnight }}>
                I have been treated by private (non-VA) doctors for service-related conditions
              </span>
            </label>
            <label className={checkboxLabelClass}>
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 focus:outline-2 focus:outline-offset-0"
                style={{ accentColor: brand.azure, outlineColor: brand.azure }}
                checked={!!data.hasVARecords}
                onChange={e => onChange({ ...data, hasVARecords: e.target.checked })}
              />
              <span className="text-sm" style={{ color: brand.midnight }}>
                I have existing VA medical records
              </span>
            </label>
            <label className={checkboxLabelClass}>
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 focus:outline-2 focus:outline-offset-0"
                style={{ accentColor: brand.azure, outlineColor: brand.azure }}
                checked={!!data.hasBuddyStatements}
                onChange={e => onChange({ ...data, hasBuddyStatements: e.target.checked })}
              />
              <span className="text-sm" style={{ color: brand.midnight }}>
                I have fellow service members or family who can provide supporting statements
              </span>
            </label>
          </div>
        </fieldset>
      );
    },
  },

  // 8. EMPLOYMENT IMPACT (ALWAYS SHOWN)
  {
    id: "employment-impact",
    title: "Employment & Disability Status",
    description: "Tell us about your current employment situation.",
    triggerCondition: () => true,
    render: (data, onChange) => {
      const checkboxLabelClass = "flex items-start gap-3 mb-4 cursor-pointer";

      return (
        <fieldset>
          <legend className="sr-only">Employment and disability status</legend>
          <div>
            <label className={checkboxLabelClass}>
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 focus:outline-2 focus:outline-offset-0"
                style={{ accentColor: brand.azure, outlineColor: brand.azure }}
                checked={!!data.cannotWork}
                onChange={e => onChange({ ...data, cannotWork: e.target.checked })}
              />
              <span className="text-sm" style={{ color: brand.midnight }}>
                My service-connected conditions prevent me from maintaining substantially gainful employment
              </span>
            </label>

            <div className="mb-4">
              <label htmlFor="disability-rating" className="block text-sm font-medium mb-2" style={{ color: brand.midnight }}>
                Existing VA Disability Rating (if any)
              </label>
              <select
                id="disability-rating"
                className="w-full rounded-lg p-2.5 text-sm bg-white focus:outline-2 focus:outline-offset-0"
                style={{ border: `1px solid ${brand.silver}`, outlineColor: brand.azure }}
                value={data.disabilityRating || 0}
                onChange={e => onChange({ ...data, disabilityRating: parseInt(e.target.value) })}
              >
                {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(r => (
                  <option key={r} value={r}>
                    {r}%{r === 0 ? " (no current rating)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <label className={checkboxLabelClass}>
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 focus:outline-2 focus:outline-offset-0"
                style={{ accentColor: brand.azure, outlineColor: brand.azure }}
                checked={!!data.interestedVocRehab}
                onChange={e => onChange({ ...data, interestedVocRehab: e.target.checked })}
              />
              <span className="text-sm" style={{ color: brand.midnight }}>
                I'm interested in vocational rehabilitation and retraining
              </span>
            </label>
          </div>
        </fieldset>
      );
    },
  },

  // 9. ADDITIONAL BENEFITS (ALWAYS SHOWN)
  {
    id: "additional-benefits",
    title: "Benefits You May Not Know About",
    description: "Explore additional VA benefits you might qualify for.",
    triggerCondition: () => true,
    render: (data, onChange) => {
      const checkboxLabelClass = "flex items-start gap-3 mb-3 cursor-pointer last:mb-0";

      return (
        <fieldset>
          <legend className="sr-only">Additional benefits</legend>
          <div className="space-y-4">
            <div>
              <label className={checkboxLabelClass}>
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 focus:outline-2 focus:outline-offset-0"
                  style={{ accentColor: brand.azure, outlineColor: brand.azure }}
                  checked={!!data.interestedHomeLoan}
                  onChange={e => onChange({ ...data, interestedHomeLoan: e.target.checked })}
                />
                <span className="text-sm" style={{ color: brand.midnight }}>
                  I'm interested in a VA home loan (no down payment, no PMI)
                </span>
              </label>
              {data.interestedHomeLoan && (
                <p className="text-xs ml-7 mt-1" style={{ color: brand.royal }}>
                  VA home loans are one of the most valuable benefits but many veterans don't use them.
                </p>
              )}
            </div>

            <label className={checkboxLabelClass}>
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 focus:outline-2 focus:outline-offset-0"
                style={{ accentColor: brand.azure, outlineColor: brand.azure }}
                checked={!!data.needsAidAttendance}
                onChange={e => onChange({ ...data, needsAidAttendance: e.target.checked })}
              />
              <span className="text-sm" style={{ color: brand.midnight }}>
                I need help with daily living activities (bathing, dressing, eating, etc.)
              </span>
            </label>

            <label className={checkboxLabelClass}>
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 focus:outline-2 focus:outline-offset-0"
                style={{ accentColor: brand.azure, outlineColor: brand.azure }}
                checked={!!data.hasFiledIntentToFile}
                onChange={e => onChange({ ...data, hasFiledIntentToFile: e.target.checked })}
              />
              <span className="text-sm" style={{ color: brand.midnight }}>
                I have already filed an Intent to File (VA Form 21-0966)
              </span>
            </label>
          </div>
        </fieldset>
      );
    },
  },
];

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────

export default function DynamicQuestionnaire({
  dd214,
  data,
  onChange,
  onSubmit,
  onBack,
}: DynamicQuestionnaireProps) {
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);

  // Determine which modules are active
  const activeModules = MODULES.filter(m => m.triggerCondition(dd214, data));

  // Get current module
  const currentModule = activeModules[currentModuleIndex];

  const handleContinue = useCallback(() => {
    if (currentModuleIndex < activeModules.length - 1) {
      setCurrentModuleIndex(currentModuleIndex + 1);
    } else {
      onSubmit();
    }
  }, [currentModuleIndex, activeModules.length, onSubmit]);

  const handleBack = useCallback(() => {
    if (currentModuleIndex > 0) {
      setCurrentModuleIndex(currentModuleIndex - 1);
    } else {
      onBack();
    }
  }, [currentModuleIndex, onBack]);

  if (!currentModule) {
    return null;
  }

  const cardStyle = {
    backgroundColor: brand.white,
    border: `1px solid ${brand.silver}`,
    borderRadius: 12,
    padding: 20,
  };

  return (
    <main className="max-w-2xl mx-auto" id="main-content">
      {/* Progress indicator */}
      <div className="mb-6 flex items-center justify-between">
        <div style={{ color: brand.royal }} className="text-sm font-medium" role="status" aria-live="polite">
          Step {currentModuleIndex + 1} of {activeModules.length}
        </div>
        <div style={{ height: 4, backgroundColor: brand.silver, borderRadius: 2, flex: 1, marginLeft: 12, marginRight: 12 }} role="progressbar" aria-valuenow={currentModuleIndex + 1} aria-valuemin={1} aria-valuemax={activeModules.length} aria-label="Progress through assessment">
          <div
            style={{
              height: "100%",
              backgroundColor: brand.azure,
              borderRadius: 2,
              width: `${((currentModuleIndex + 1) / activeModules.length) * 100}%`,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Module card */}
      <div style={cardStyle}>
        <h2 className="text-lg font-bold mb-2" style={{ color: brand.midnight }}>
          {currentModule.title}
        </h2>
        <p className="text-sm mb-4" style={{ color: brand.royal, opacity: 0.8 }}>
          {currentModule.description}
        </p>

        {currentModule.render(data, onChange, dd214)}
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={handleBack}
          className="px-6 py-3 rounded-lg font-medium focus:outline-2 focus:outline-offset-0"
          style={{ border: `1px solid ${brand.silver}`, color: brand.midnight, outlineColor: brand.azure }}
        >
          &larr; Back
        </button>
        <button
          onClick={handleContinue}
          className="flex-1 text-white py-3 rounded-lg font-semibold transition-colors focus:outline-2 focus:outline-offset-0"
          style={{ backgroundColor: brand.royal, outlineColor: brand.azure }}
        >
          {currentModuleIndex === activeModules.length - 1 ? "See My Benefits →" : "Continue →"}
        </button>
      </div>
    </main>
  );
}
