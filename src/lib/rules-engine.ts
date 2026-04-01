// ─── VA RULES ENGINE ────────────────────────────────────────────────────
// Comprehensive business logic for evaluating veteran benefits eligibility
// Covers: disability compensation, healthcare, education, home loan, vocational rehab, and specialized benefits

export interface DD214Data {
  name: string;
  branch: string;
  mos: string;
  rank: string;
  enteredActiveDuty: string;
  separationDate: string;
  characterOfDischarge: string;
  decorations: string;
  dutyLocations: string;
  remarks: string;
  narrativeReason: string;
  totalServiceMonths?: number;
  // Service Number (Block 4b) / DOD ID Number — used on some VA forms
  serviceNumber?: string;
  // Personal info — SSN (Block 3), DOB (Block 5), contact info
  ssn?: string;
  dob?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
}

export interface QuestionnaireData {
  // Existing fields
  conditions: string[];
  hasPTSD: boolean;
  hasTBI: boolean;
  hasTinnitus: boolean;
  hasHearingLoss: boolean;
  hasPrivateMedical: boolean;
  hasVARecords: boolean;
  hasBuddyStatements: boolean;
  cannotWork: boolean;
  disabilityRating: number;
  hasFiledIntentToFile: boolean;

  // New fields: Camp Lejeune
  servedCampLejeune?: boolean;
  campLejeuneConditions?: string[];

  // New fields: Radiation exposure
  radiationExposure?: boolean;
  radiationActivity?: string; // e.g., "nuclear tests", "Hiroshima", "Enewetak", etc.
  burnPitExposure?: boolean;
  otherExposure?: boolean;

  // New fields: Military Sexual Trauma
  experiencedMST?: boolean;
  mstConditions?: string[];

  // New fields: Secondary conditions
  hasSecondaryConditions?: boolean;
  secondaryPairs?: Array<{ primary: string; secondary: string }>;

  // New fields: Benefits interests
  interestedHomeLoan?: boolean;
  interestedVocRehab?: boolean;

  // New fields: Aid & Attendance
  needsAidAttendance?: boolean;
  aidAttendanceNeeds?: string[];
}

export interface FormRecommendation {
  form: string;
  name: string;
  reason: string;
  priority: "critical" | "primary" | "conditional";
}

export interface PresumptiveMatch {
  category: string;
  reason: string;
  conditions: string[];
}

export interface BenefitResult {
  eligible: boolean;
  details: string[];
  forms: FormRecommendation[];
  docs: string[];
  presumptiveConditions?: PresumptiveMatch[];
  priorityGroup?: number | null;
  tier?: { months: number; percentage: number } | null;
}

export interface EligibilityResults {
  disabilityComp: BenefitResult;
  healthcare: BenefitResult;
  education: BenefitResult;
  homeLoan: BenefitResult;
  vocRehab: BenefitResult;
  aidAttendance: BenefitResult;
  secondaryConditions: BenefitResult;
  warnings: string[];
  recommendations: string[];
}

// ─── REFERENCE DATA ─────────────────────────────────────────────────────

export const PRESUMPTIVE_CONDITIONS: Record<string, {
  label: string;
  triggerLocations?: string[];
  triggerDateRange?: { start: string; end: string };
  triggerMOS?: string[];
  conditions: string[];
}> = {
  agentOrange: {
    label: "Agent Orange / Herbicide Exposure",
    triggerLocations: ["Vietnam", "Thailand", "Korea DMZ"],
    triggerDateRange: { start: "1962-01-01", end: "1975-05-07" },
    conditions: [
      "Type 2 Diabetes", "Ischemic Heart Disease", "Parkinson's Disease",
      "Bladder Cancer", "Hypertension", "B-Cell Leukemia",
      "Chronic Lymphocytic Leukemia", "Hodgkin's Disease",
      "Multiple Myeloma", "Non-Hodgkin's Lymphoma",
      "Prostate Cancer", "Respiratory Cancers", "Soft Tissue Sarcomas"
    ]
  },
  burnPits: {
    label: "Burn Pit / Airborne Hazards (PACT Act)",
    triggerLocations: ["Iraq", "Afghanistan", "Southwest Asia", "Syria", "Jordan", "Kuwait", "Saudi Arabia"],
    triggerDateRange: { start: "1990-08-02", end: "2099-12-31" },
    conditions: [
      "Constrictive Bronchiolitis", "Constrictive Pericarditis",
      "Lung Cancer (any type)", "Squamous Cell Carcinoma of the Head/Neck",
      "Respiratory Cancer", "Glioblastoma", "Lymphatic Cancer",
      "Kidney Cancer", "Melanoma", "Pancreatic Cancer",
      "Reproductive Cancers", "Chronic Sinusitis", "Chronic Rhinitis",
      "Chronic Laryngitis", "COPD", "Pulmonary Fibrosis"
    ]
  },
  gulfWar: {
    label: "Gulf War Illness",
    triggerLocations: ["Iraq", "Kuwait", "Saudi Arabia", "Southwest Asia"],
    triggerDateRange: { start: "1990-08-02", end: "2099-12-31" },
    conditions: [
      "Chronic Fatigue Syndrome", "Fibromyalgia", "Irritable Bowel Syndrome",
      "Functional Gastrointestinal Disorders", "Undiagnosed Chronic Pain",
      "Unexplained Neurological Symptoms", "Chronic Headaches"
    ]
  },
  noiseExposure: {
    label: "Noise Exposure (MOS-based)",
    triggerMOS: ["11B","11C","13B","13F","19D","19K","12B","68W","15T","15U","15R","92F","88M","91B","94E"],
    conditions: ["Tinnitus", "Bilateral Hearing Loss", "Sensorineural Hearing Loss"]
  },
  campLejeune: {
    label: "Camp Lejeune Water Contamination",
    triggerLocations: ["Camp Lejeune", "MCAS New River"],
    triggerDateRange: { start: "1953-08-01", end: "1987-12-31" },
    conditions: [
      "Adult leukemia", "Aplastic anemia", "Myelodysplastic syndromes",
      "Bladder cancer", "Kidney cancer", "Liver cancer", "Multiple myeloma",
      "Non-Hodgkin's lymphoma", "Parkinson's disease"
    ]
  },
  radiation: {
    label: "Radiation Exposure (Atomic Veterans)",
    triggerLocations: ["Nevada", "Pacific Ocean", "Japan", "Enewetak Atoll", "Greenland"],
    triggerDateRange: { start: "1945-01-01", end: "1980-12-31" },
    conditions: [
      "Bile duct cancer", "Bone cancer", "Brain cancer", "Breast cancer",
      "Colon cancer", "Esophageal cancer", "Gallbladder cancer", "Liver cancer",
      "Lung cancer", "Pancreatic cancer", "Pharyngeal cancer", "Ovarian cancer",
      "Salivary gland cancer", "Small intestine cancer", "Stomach cancer",
      "Thyroid cancer", "Urinary tract cancer"
    ]
  }
};

export const SECONDARY_CONDITION_PAIRS: Array<{
  primary: string;
  secondaries: string[];
  explanation: string;
}> = [
  {
    primary: "Back injury / chronic pain",
    secondaries: ["Depression", "Anxiety", "Sleep disorders", "Radiculopathy"],
    explanation: "Chronic pain frequently causes or worsens mental health conditions"
  },
  {
    primary: "Diabetes (Type 2)",
    secondaries: ["Peripheral neuropathy", "Vision problems (retinopathy)", "Kidney disease (nephropathy)", "Erectile dysfunction"],
    explanation: "Diabetes damages nerves and blood vessels throughout the body"
  },
  {
    primary: "PTSD",
    secondaries: ["Substance use disorder", "Sleep apnea", "Depression", "Anxiety", "Hypertension"],
    explanation: "PTSD's chronic stress response affects multiple body systems"
  },
  {
    primary: "Knee injury",
    secondaries: ["Hip problems", "Gait disorders", "Lower back pain", "Opposite knee condition"],
    explanation: "Compensating for knee pain changes biomechanics"
  },
  {
    primary: "Hearing loss",
    secondaries: ["Tinnitus", "Depression", "Social isolation"],
    explanation: "Hearing loss commonly co-occurs with tinnitus and impacts mental health"
  },
  {
    primary: "TBI / head injury",
    secondaries: ["Migraines/headaches", "Vision problems", "Cognitive disorders", "Depression", "Sleep disorders"],
    explanation: "TBI can cause widespread neurological effects"
  },
  {
    primary: "Neck injury",
    secondaries: ["Headaches", "Radiculopathy", "Vision problems"],
    explanation: "Cervical spine issues frequently radiate to head and extremities"
  },
  {
    primary: "Medication side effects",
    secondaries: ["Gastrointestinal conditions", "Weight gain", "Sexual dysfunction", "Liver/kidney issues"],
    explanation: "Medications for SC conditions can cause new compensable conditions"
  }
];

export const MOS_DESCRIPTIONS: Record<string, string> = {
  "11B": "Infantryman", "11C": "Indirect Fire Infantryman", "13B": "Cannon Crewmember",
  "13F": "Fire Support Specialist", "19D": "Cavalry Scout", "19K": "M1 Armor Crewmember",
  "12B": "Combat Engineer", "68W": "Combat Medic", "15T": "UH-60 Helicopter Repairer",
  "15U": "CH-47 Helicopter Repairer", "15R": "AH-64 Attack Helicopter Repairer",
  "92F": "Petroleum Supply Specialist", "88M": "Motor Transport Operator",
  "91B": "Wheeled Vehicle Mechanic", "94E": "Radio/Comms Security Repairer",
  "25B": "IT Specialist", "42A": "Human Resources Specialist",
  "35F": "Intelligence Analyst", "31B": "Military Police", "35M": "Human Intelligence Collector",
  "18B": "Special Forces Weapons Sergeant", "18D": "Special Forces Medical Sergeant",
  "68C": "Practical Nursing Specialist", "92Y": "Unit Supply Specialist",
  "0311": "Rifleman (USMC)", "0331": "Machine Gunner (USMC)", "0341": "Mortarman (USMC)",
  "0351": "Assaultman (USMC)", "0369": "Infantry Unit Leader (USMC)",
  "BM": "Boatswain's Mate (USN)", "GM": "Gunner's Mate (USN)", "HM": "Hospital Corpsman (USN)"
};

export const PRIORITY_GROUPS = [
  { group: 1, criteria: "50%+ service-connected disability rating", copay: "None" },
  { group: 2, criteria: "30-40% service-connected disability rating", copay: "None" },
  { group: 3, criteria: "10-20% disability, Purple Heart, former POW, or disability discharge", copay: "None" },
  { group: 4, criteria: "Catastrophically disabled", copay: "None" },
  { group: 5, criteria: "Non-compensable 0% disability or below income threshold", copay: "Reduced" },
  { group: 6, criteria: "Specific exposure categories (Agent Orange, radiation, Gulf War, burn pits)", copay: "Reduced" },
  { group: 7, criteria: "Below income threshold (with adjustments)", copay: "Reduced" },
  { group: 8, criteria: "Above income threshold, agrees to copays", copay: "Full" }
];

const GI_BILL_TIERS = [
  { months: 36, percentage: 100 },
  { months: 30, percentage: 90 },
  { months: 24, percentage: 80 },
  { months: 18, percentage: 70 },
  { months: 12, percentage: 60 },
  { months: 6, percentage: 50 },
  { months: 3, percentage: 40 }
];

// ─── MAIN EVALUATION FUNCTION ───────────────────────────────────────────

export function evaluateEligibility(dd214: DD214Data, questionnaire: Partial<QuestionnaireData>): EligibilityResults {
  const results: EligibilityResults = {
    disabilityComp: { eligible: false, details: [], forms: [], docs: [], presumptiveConditions: [] },
    healthcare: { eligible: false, details: [], forms: [], docs: [], priorityGroup: null },
    education: { eligible: false, details: [], forms: [], docs: [], tier: null },
    homeLoan: { eligible: false, details: [], forms: [], docs: [] },
    vocRehab: { eligible: false, details: [], forms: [], docs: [] },
    aidAttendance: { eligible: false, details: [], forms: [], docs: [] },
    secondaryConditions: { eligible: false, details: [], forms: [], docs: [] },
    warnings: [],
    recommendations: []
  };

  const discharge = dd214.characterOfDischarge;
  const isHonorable = discharge === "Honorable";
  const isGeneral = discharge === "General (Under Honorable Conditions)";
  const isOTH = discharge === "Other Than Honorable";
  const isBadConduct = discharge === "Bad Conduct";

  // Gate check: Dishonorable
  if (discharge === "Dishonorable") {
    results.warnings.push("A Dishonorable discharge generally bars eligibility for all VA benefits. You may wish to consult a Veterans Service Organization (VSO) about discharge upgrade options.");
    return results;
  }

  if (isBadConduct) {
    results.warnings.push("A Bad Conduct Discharge may still allow some VA benefits through a Character of Service determination. The VA reviews your full service record. Consider consulting a VSO.");
  }

  const serviceStart = new Date(dd214.enteredActiveDuty);
  const serviceEnd = new Date(dd214.separationDate);

  // Calculate service duration
  const serviceDays = Math.floor((serviceEnd.getTime() - serviceStart.getTime()) / (24 * 60 * 60 * 1000));
  const isWartimeService = isWartimeEra(serviceStart, serviceEnd);

  // ── DISABILITY COMPENSATION ──────────────────────────────────────────
  if (isHonorable || isGeneral || isOTH || isBadConduct) {
    results.disabilityComp.eligible = true;
    if (isOTH) {
      results.disabilityComp.details.push("With an OTH discharge, eligibility requires a favorable Character of Service determination by the VA (expanded access since June 2024).");
    }
    if (isBadConduct) {
      results.disabilityComp.details.push("With a Bad Conduct Discharge, eligibility requires a favorable Character of Service determination by the VA. The VA reviews your full service record on a case-by-case basis.");
    }
    results.disabilityComp.details.push("You may be eligible for disability compensation for any condition caused or worsened by your military service.");

    results.disabilityComp.forms.push({
      form: "VA Form 21-0966", name: "Intent to File",
      reason: "Preserves your effective date — file this FIRST to protect your retroactive pay date",
      priority: "critical"
    });
    results.disabilityComp.forms.push({
      form: "VA Form 21-526EZ", name: "Disability Compensation Application",
      reason: "Primary application for service-connected disability benefits",
      priority: "primary"
    });

    results.disabilityComp.docs.push("DD-214 (Member 4 long form preferred)");
    results.disabilityComp.docs.push("Medical treatment records (VA and private)");
    results.disabilityComp.docs.push("Nexus letter from a medical provider linking condition to service");

    // Check presumptive conditions
    const locations = (dd214.dutyLocations || "").toLowerCase() + " " + (dd214.remarks || "").toLowerCase();
    const mos = dd214.mos?.split(/[\s\u2014-]/)[0]?.trim() || "";

    Object.entries(PRESUMPTIVE_CONDITIONS).forEach(([_key, rule]) => {
      let triggered = false;
      let triggerReason = "";

      if (rule.triggerLocations && rule.triggerDateRange) {
        const locationMatch = rule.triggerLocations.some(loc => locations.includes(loc.toLowerCase()));
        const dateOverlap = serviceStart <= new Date(rule.triggerDateRange.end) && serviceEnd >= new Date(rule.triggerDateRange.start);
        if (locationMatch && dateOverlap) {
          triggered = true;
          const matchedLoc = rule.triggerLocations.find(l => locations.includes(l.toLowerCase()));
          triggerReason = `Based on your service in ${matchedLoc} during the applicable period`;
        }
      }
      if (rule.triggerMOS && rule.triggerMOS.includes(mos)) {
        triggered = true;
        triggerReason = `Based on your MOS (${mos} — ${MOS_DESCRIPTIONS[mos] || "military specialty"}) which involves occupational exposure`;
      }

      if (triggered) {
        results.disabilityComp.presumptiveConditions!.push({
          category: rule.label, reason: triggerReason, conditions: rule.conditions
        });
      }
    });

    if (results.disabilityComp.presumptiveConditions!.length > 0) {
      results.recommendations.push("You have presumptive condition eligibility — these conditions do NOT require a nexus letter, making claims significantly easier.");
    }

    // MST handling
    if (questionnaire?.experiencedMST) {
      results.disabilityComp.forms.push({
        form: "VA Form 21-0781",
        name: "Statement in Support of Claim for PTSD (Military Sexual Trauma)",
        reason: "Special form for MST cases. NOTE: You do NOT need an official incident report. The VA accepts behavioral change markers and fear responses as evidence.",
        priority: "critical"
      });
      results.disabilityComp.details.push("Military Sexual Trauma (MST) has special evidence rules: You don't need a formal report of the incident. The VA recognizes behavioral changes, anxiety, fear of others, etc. as evidence of trauma.");
      results.recommendations.push("MST claims have special consideration: you do NOT need official documentation of the incident. Behavioral changes and your own statement are often sufficient evidence.");
    }

    if (questionnaire?.hasPTSD) {
      results.disabilityComp.forms.push({
        form: "VA Form 21-0781", name: "PTSD Statement",
        reason: "Required when claiming PTSD — documents your in-service stressor events",
        priority: "conditional"
      });
    }
    if (questionnaire?.hasPrivateMedical) {
      results.disabilityComp.forms.push({
        form: "VA Form 21-4142", name: "Medical Records Release",
        reason: "Authorizes VA to obtain records from your private doctors",
        priority: "conditional"
      });
      results.disabilityComp.forms.push({
        form: "VA Form 21-4142a", name: "Provider Information",
        reason: "Lists your private medical providers",
        priority: "conditional"
      });
    }
    if (questionnaire?.cannotWork) {
      results.disabilityComp.forms.push({
        form: "VA Form 21-8940", name: "Unemployability (TDIU)",
        reason: "If your disability prevents you from working, you may receive 100% compensation rate",
        priority: "conditional"
      });
      results.disabilityComp.docs.push("Complete employment history");
    }
    if (questionnaire?.hasBuddyStatements) {
      results.disabilityComp.docs.push("Buddy/lay statements from fellow service members or family (VA Form 21-4138)");
    }
  }

  // ── HEALTHCARE ───────────────────────────────────────────────────────
  if (isHonorable || isGeneral || isOTH || isBadConduct) {
    results.healthcare.eligible = true;
    if (isOTH) {
      results.healthcare.details.push("OTH discharge: The VA may still grant healthcare access via Character of Service determination (expanded June 2024 rules).");
    }
    if (isBadConduct) {
      results.healthcare.details.push("Bad Conduct Discharge: The VA may grant healthcare access via Character of Service determination. Mental health care for conditions related to MST is available regardless of discharge type.");
    }
    results.healthcare.forms.push({
      form: "VA Form 10-10EZ", name: "Healthcare Enrollment",
      reason: "Application to enroll in VA healthcare system",
      priority: "primary"
    });
    results.healthcare.docs.push("DD-214");

    const hasPurpleHeart = (dd214.decorations || "").toLowerCase().includes("purple heart");
    const hasCombatService = !!(dd214.decorations || "").toLowerCase().match(/combat action|combat infantry|bronze star/);
    const disabilityRating = questionnaire?.disabilityRating || 0;

    if (disabilityRating >= 50) {
      results.healthcare.priorityGroup = 1;
    } else if (disabilityRating >= 30) {
      results.healthcare.priorityGroup = 2;
    } else if (disabilityRating >= 10 || hasPurpleHeart) {
      results.healthcare.priorityGroup = 3;
      if (hasPurpleHeart) results.healthcare.details.push("Purple Heart qualifies you for Priority Group 3 — no copays for VA healthcare.");
    } else if (hasCombatService) {
      const yearsFromSeparation = (Date.now() - serviceEnd.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (yearsFromSeparation <= 10) {
        results.healthcare.details.push(`As a combat veteran, you have enhanced healthcare eligibility for ${Math.ceil(10 - yearsFromSeparation)} more years.`);
        results.healthcare.priorityGroup = 6;
      }
    } else {
      results.healthcare.priorityGroup = 7;
      results.healthcare.details.push("Healthcare enrollment may require income assessment (means testing). Priority group depends on your household income relative to VA thresholds.");
      results.healthcare.docs.push("Previous year household income information");
      results.healthcare.docs.push("Insurance information (if any)");
    }

    if (results.healthcare.priorityGroup) {
      const pg = PRIORITY_GROUPS.find(p => p.group === results.healthcare.priorityGroup);
      if (pg) results.healthcare.details.push(`Estimated Priority Group: ${pg.group} — Copay level: ${pg.copay}`);
    }
  }

  // ── EDUCATION (GI BILL) ──────────────────────────────────────────────
  if (isHonorable) {
    const post911Start = new Date("2001-09-10");
    const totalMonths = dd214.totalServiceMonths || Math.round((serviceEnd.getTime() - serviceStart.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
    const isDisabilityDischarge = dd214.narrativeReason?.toLowerCase().includes("disability");

    if (serviceEnd > post911Start) {
      const post911Months = Math.round(
        (Math.min(serviceEnd.getTime(), Date.now()) - Math.max(serviceStart.getTime(), post911Start.getTime())) / (30.44 * 24 * 60 * 60 * 1000)
      );

      // Disability separation grants 100% GI Bill regardless of service length
      if (isDisabilityDischarge) {
        results.education.eligible = true;
        results.education.tier = { months: 0, percentage: 100 };
        results.education.details.push("Your separation for disability qualifies you for 100% Post-9/11 GI Bill benefits regardless of service length.");
        results.education.details.push("This covers 100% of tuition/fees, monthly housing allowance, and $1,000/year book stipend.");
        results.education.forms.push({
          form: "VA Form 22-1990", name: "Education Benefits Application",
          reason: "Application for GI Bill education benefits",
          priority: "primary"
        });
        results.education.docs.push("DD-214");
        results.education.docs.push("School enrollment letter or acceptance letter");
      } else if (post911Months >= 3) {
        const tier = GI_BILL_TIERS.find(t => post911Months >= t.months) || GI_BILL_TIERS[GI_BILL_TIERS.length - 1];
        results.education.eligible = true;
        results.education.tier = tier;
        results.education.details.push(`Post-9/11 GI Bill (Chapter 33): Eligible at ${tier.percentage}% based on ~${post911Months} months of post-9/11 service.`);
        results.education.details.push(`This covers ${tier.percentage}% of tuition/fees, monthly housing allowance, and $1,000/year book stipend.`);
        results.education.forms.push({
          form: "VA Form 22-1990", name: "Education Benefits Application",
          reason: "Application for GI Bill education benefits",
          priority: "primary"
        });
        results.education.docs.push("DD-214");
        results.education.docs.push("School enrollment letter or acceptance letter");
      }
    }

    if (totalMonths >= 24) {
      results.education.details.push("You may also be eligible for Montgomery GI Bill (Chapter 30) if you opted in during service. Chapter 33 (Post-9/11) is usually more generous.");
    }
  } else if (isGeneral) {
    results.education.eligible = false;
    results.education.details.push("The GI Bill requires an Honorable discharge. A General (Under Honorable Conditions) discharge does not qualify for education benefits.");
    results.warnings.push("Consider applying for a discharge upgrade — if successful, it would unlock GI Bill eligibility. Contact your branch's Discharge Review Board.");
  }

  // ── HOME LOAN ────────────────────────────────────────────────────────
  if (isHonorable || isGeneral) {
    const qualifiesForHomeLoan =
      (isWartimeService && serviceDays >= 90) ||
      (!isWartimeService && serviceDays >= 181) ||
      (dd214.narrativeReason?.toLowerCase().includes("disability"));

    if (qualifiesForHomeLoan) {
      results.homeLoan.eligible = true;
      results.homeLoan.details.push("You qualify for a VA home loan — this is one of the most valuable veteran benefits and many veterans don't realize they have it.");
      results.homeLoan.details.push("VA loans offer: no down payment, no PMI, typically lower interest rates, and favorable terms.");

      const hasDisabilityOrPurpleHeart = (questionnaire?.disabilityRating || 0) > 0 || (dd214.decorations || "").toLowerCase().includes("purple heart");
      if (hasDisabilityOrPurpleHeart) {
        results.homeLoan.details.push("IMPORTANT: You qualify for a funding fee exemption due to your disability rating or Purple Heart. This saves you thousands.");
      } else {
        results.homeLoan.details.push("Note: You may owe a funding fee (1-3.3% of loan amount) unless you have a disability rating or Purple Heart.");
      }

      results.homeLoan.forms.push({
        form: "VA Form 26-1880", name: "Request for a Certificate of Eligibility (COE)",
        reason: "Proves your eligibility to your lender. Can be obtained online via VA.gov or through your lender.",
        priority: "primary"
      });
      results.homeLoan.docs.push("DD-214");
      results.homeLoan.docs.push("Proof of current income and employment");
      results.homeLoan.docs.push("Credit report authorization");

      results.recommendations.push("HOME LOAN: Most veterans qualify but don't use this benefit. VA home loans offer significant advantages. Consider getting your Certificate of Eligibility even if you're not buying now.");
    }
  }

  // ── VOCATIONAL REHABILITATION (CHAPTER 31) ─────────────────────────────
  if (isHonorable || isGeneral || isOTH || isBadConduct) {
    const disabilityRating = questionnaire?.disabilityRating || 0;
    const qualifiesForVocRehab =
      (disabilityRating >= 10) ||
      (disabilityRating > 0 && questionnaire?.cannotWork); // Severe employment handicap

    if (qualifiesForVocRehab) {
      results.vocRehab.eligible = true;
      results.vocRehab.details.push("Chapter 31 Vocational Rehabilitation helps service-connected disabled veterans with job training and placement.");
      results.vocRehab.details.push("Covers: education/training, job placement, supplies/equipment, and subsistence allowance during training.");
      results.vocRehab.details.push("You have 12 years from separation or notification of disability rating to use these benefits (delimiting period).");

      if (questionnaire?.cannotWork) {
        results.vocRehab.details.push("Because you indicated you cannot work, this benefit is HIGHLY RECOMMENDED for retraining in a field you can perform.");
      }

      results.vocRehab.forms.push({
        form: "VA Form 28-1900", name: "Application for Vocational Rehabilitation",
        reason: "Primary application for Chapter 31 benefits",
        priority: "primary"
      });
      results.vocRehab.docs.push("DD-214");
      results.vocRehab.docs.push("Recent disability rating decision from VA");
      results.vocRehab.docs.push("Medical evidence of service-connected disability");

      if (questionnaire?.cannotWork || disabilityRating >= 20) {
        results.recommendations.push("VOCATIONAL REHAB: You qualify for Chapter 31. If you're unable to work, this is a critical resource for retraining and job placement.");
      }
    }
  }

  // ── AID & ATTENDANCE ─────────────────────────────────────────────────
  if (questionnaire?.needsAidAttendance) {
    results.aidAttendance.eligible = true;
    results.aidAttendance.details.push("Aid & Attendance (A&A) is Special Monthly Compensation added to your disability rating if you need help with daily living.");
    results.aidAttendance.details.push("You qualify if you need personal assistance with: bathing, dressing, eating, grooming, using the toilet, or are housebound.");
    results.aidAttendance.details.push("This is paid as a monthly addition to your disability compensation (not a separate benefit).");

    if (questionnaire.aidAttendanceNeeds && questionnaire.aidAttendanceNeeds.length > 0) {
      results.aidAttendance.details.push(`You indicated needing help with: ${questionnaire.aidAttendanceNeeds.join(", ")}`);
    }

    results.aidAttendance.forms.push({
      form: "VA Form 21-2680", name: "Examination for Housebound Status or Permanent Need for Aid and Attendance",
      reason: "Required to establish A&A eligibility. Must be completed with your VA provider.",
      priority: "primary"
    });
    results.aidAttendance.docs.push("Medical evidence of need for assistance");
    results.aidAttendance.docs.push("Care provider statements (if applicable)");
    results.aidAttendance.docs.push("Documentation of daily living limitations");

    results.recommendations.push("AID & ATTENDANCE: If approved, this significantly increases your monthly VA payment. Ensure your provider documents your specific care needs clearly.");
  }

  // ── SECONDARY CONDITIONS ─────────────────────────────────────────────
  let hasSecondaryEligibility = false;

  if (questionnaire?.hasSecondaryConditions && questionnaire.secondaryPairs && questionnaire.secondaryPairs.length > 0) {
    hasSecondaryEligibility = true;
    results.secondaryConditions.eligible = true;
    results.secondaryConditions.details.push("You indicated secondary conditions that may be service-connected due to your primary conditions.");
    results.secondaryConditions.details.push("Secondary conditions are rated separately and add to your total disability rating.");

    questionnaire.secondaryPairs.forEach(pair => {
      const pairInfo = SECONDARY_CONDITION_PAIRS.find(
        p => p.primary.toLowerCase() === pair.primary.toLowerCase()
      );
      if (pairInfo) {
        results.secondaryConditions.details.push(`${pair.primary} → ${pair.secondary}: ${pairInfo.explanation}`);
      }
    });
  } else if (questionnaire?.conditions && questionnaire.conditions.length > 0) {
    // Auto-detect potential secondary conditions
    const detectedSecondaries = detectSecondaryConditions(questionnaire.conditions);
    if (detectedSecondaries.length > 0) {
      hasSecondaryEligibility = true;
      results.secondaryConditions.eligible = true;
      results.secondaryConditions.details.push("We detected potential secondary conditions based on your primary conditions:");
      detectedSecondaries.forEach(detection => {
        results.secondaryConditions.details.push(`• ${detection.primary} may lead to: ${detection.secondaries.join(", ")}`);
      });
    }
  }

  if (hasSecondaryEligibility) {
    results.secondaryConditions.forms.push({
      form: "VA Form 21-526EZ", name: "Supplemental Disability Claim",
      reason: "Used to claim secondary conditions on top of your existing service-connected disability",
      priority: "conditional"
    });
    results.secondaryConditions.docs.push("Nexus letter linking secondary condition to primary condition");
    results.secondaryConditions.docs.push("Medical evidence of both primary and secondary conditions");

    results.recommendations.push("SECONDARY CONDITIONS: Many veterans miss additional compensation by not claiming secondary conditions. Include these in your claim with medical evidence linking them to your primary conditions.");
  }

  // ── CROSS-CUTTING RECOMMENDATIONS ────────────────────────────────────
  if (results.disabilityComp.eligible && !questionnaire?.hasFiledIntentToFile) {
    results.recommendations.unshift("FILE INTENT TO FILE (VA Form 21-0966) TODAY — this preserves your effective date and gives you 1 year to complete your full claim. Every month you wait could mean lost retroactive pay.");
  }

  if (results.disabilityComp.presumptiveConditions!.length > 0) {
    results.recommendations.push("Review the presumptive conditions below carefully — many veterans don't realize they qualify for these, and they're much easier to claim.");
  }

  if (questionnaire?.conditions && questionnaire.conditions.filter(c => c.trim()).length > 0) {
    results.recommendations.push("Consider whether any of your conditions caused secondary conditions. For example: a back injury can cause knee problems, chronic pain can cause depression, and medication side effects can be service-connected.");
  }

  return results;
}

// ─── HELPER FUNCTIONS ───────────────────────────────────────────────────

function isWartimeEra(serviceStart: Date, serviceEnd: Date): boolean {
  const wartimePeriods = [
    { start: new Date("1941-12-07"), end: new Date("1946-12-31") }, // WWII
    { start: new Date("1950-06-27"), end: new Date("1955-01-31") }, // Korea
    { start: new Date("1964-08-05"), end: new Date("1975-05-07") }, // Vietnam
    { start: new Date("1990-08-02"), end: new Date("1991-04-11") }, // Gulf War
    { start: new Date("2001-09-11"), end: new Date("2024-12-31") }  // War on Terror (ongoing)
  ];

  return wartimePeriods.some(period =>
    serviceStart <= period.end && serviceEnd >= period.start
  );
}

export function detectSecondaryConditions(conditions: string[]): Array<{ primary: string; secondaries: string[] }> {
  const detected: Array<{ primary: string; secondaries: string[] }> = [];
  const lowerConditions = conditions.map(c => c.toLowerCase());

  SECONDARY_CONDITION_PAIRS.forEach(pair => {
    const pairPrimaryLower = pair.primary.toLowerCase();
    if (lowerConditions.some(c => c.includes(pairPrimaryLower.split(/\s+/)[0]))) {
      detected.push({ primary: pair.primary, secondaries: pair.secondaries });
    }
  });

  return detected;
}
