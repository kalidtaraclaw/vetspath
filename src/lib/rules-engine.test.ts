// ─── COMPREHENSIVE TEST SUITE FOR VA RULES ENGINE ──────────────────────────
// Tests all business logic paths and edge cases
// Run with: npx ts-node --compiler-options '{"module":"commonjs","moduleResolution":"node"}' src/lib/rules-engine.test.ts

import {
  evaluateEligibility,
  DD214Data,
  QuestionnaireData,
  EligibilityResults,
  PRESUMPTIVE_CONDITIONS,
  SECONDARY_CONDITION_PAIRS,
  FormRecommendation
} from './rules-engine';

// ─── TEST UTILITIES ─────────────────────────────────────────────────────

interface TestCase {
  name: string;
  dd214: DD214Data;
  questionnaire: Partial<QuestionnaireData>;
  assertions: (results: EligibilityResults) => void;
}

let testsPassed = 0;
let testsFailed = 0;
const failedTests: string[] = [];

function assert(condition: boolean, message: string, testName: string) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    testsFailed++;
    failedTests.push(`${testName}: ${message}`);
  } else {
    testsPassed++;
  }
}

function runTest(testCase: TestCase) {
  console.log(`\n[TEST] ${testCase.name}`);
  try {
    const results = evaluateEligibility(testCase.dd214, testCase.questionnaire);
    testCase.assertions(results);
  } catch (error) {
    console.error(`  EXCEPTION: ${error}`);
    testsFailed++;
    failedTests.push(`${testCase.name}: Exception - ${error}`);
  }
}

// ─── SAMPLE DD-214 BUILDERS ─────────────────────────────────────────────

function createDD214(overrides: Partial<DD214Data> = {}): DD214Data {
  const base: DD214Data = {
    name: "John Veteran",
    branch: "Army",
    mos: "11B - Infantryman",
    rank: "SGT (E-5)",
    enteredActiveDuty: "2003-03-15",
    separationDate: "2007-03-14",
    characterOfDischarge: "Honorable",
    decorations: "Army Good Conduct Medal",
    dutyLocations: "Fort Bragg, Fort Jackson",
    remarks: "",
    narrativeReason: "Reduction in Force (RIF)",
    totalServiceMonths: 48
  };
  return { ...base, ...overrides };
}

// ─── TEST CASES ─────────────────────────────────────────────────────────

const testCases: TestCase[] = [
  // ─── DISCHARGE CHARACTER TESTS ──────────────────────────────────────

  {
    name: "Honorable discharge Vietnam veteran (Agent Orange presumptive)",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "1968-06-15",
      separationDate: "1970-06-14",
      dutyLocations: "Vietnam, Saigon",
      decorations: "Bronze Star",
      remarks: "Herbicide exposed"
    }),
    questionnaire: {
      conditions: ["Type 2 Diabetes"],
      disabilityRating: 20,
      hasFiledIntentToFile: false
    },
    assertions: (results) => {
      const testName = "Agent Orange Vietnam vet";
      assert(results.disabilityComp.eligible, "Disability comp eligible", testName);
      assert(results.healthcare.eligible, "Healthcare eligible", testName);
      assert(results.homeLoan.eligible, "Home loan eligible (wartime 90+ days)", testName);
      assert(
        results.disabilityComp.presumptiveConditions!.some(p => p.category.includes("Agent Orange")),
        "Agent Orange presumptive detected",
        testName
      );
      assert(
        results.disabilityComp.forms.some(f => f.form === "VA Form 21-0966"),
        "Intent to File form recommended",
        testName
      );
      assert(results.warnings.length === 0, "No warnings for honorable discharge", testName);
    }
  },

  {
    name: "Honorable discharge post-9/11 combat vet (burn pits, GI Bill, home loan)",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "2005-01-10",
      separationDate: "2013-01-09",
      dutyLocations: "Fort Campbell, Iraq, Afghanistan",
      decorations: "Purple Heart, Combat Infantryman Badge, Bronze Star",
      remarks: "Burn pit exposure"
    }),
    questionnaire: {
      conditions: ["PTSD", "Chronic pain"],
      disabilityRating: 40,
      hasFiledIntentToFile: true
    },
    assertions: (results) => {
      const testName = "Post-9/11 burn pit veteran";
      assert(results.disabilityComp.eligible, "Disability comp eligible", testName);
      assert(results.healthcare.eligible, "Healthcare eligible", testName);
      assert(results.education.eligible, "GI Bill eligible (post-9/11 service)", testName);
      assert(results.education.tier?.percentage === 100, "GI Bill at 100% (8 years post-9/11 service)", testName);
      assert(results.homeLoan.eligible, "Home loan eligible", testName);
      assert(results.healthcare.priorityGroup === 2, "Priority Group 2 (30-40% disability)", testName);
      assert(
        results.disabilityComp.presumptiveConditions!.some(p => p.category.includes("Burn Pit")),
        "Burn pit presumptive detected",
        testName
      );
      assert(
        results.disabilityComp.forms.some(f => f.form === "VA Form 21-0781"),
        "PTSD form recommended",
        testName
      );
    }
  },

  {
    name: "General discharge (limited education benefits)",
    dd214: createDD214({
      characterOfDischarge: "General (Under Honorable Conditions)",
      enteredActiveDuty: "2010-02-01",
      separationDate: "2014-02-01"
    }),
    questionnaire: {
      conditions: [],
      disabilityRating: 0
    },
    assertions: (results) => {
      const testName = "General discharge";
      assert(results.disabilityComp.eligible, "Disability comp eligible", testName);
      assert(results.healthcare.eligible, "Healthcare eligible", testName);
      assert(!results.education.eligible, "GI Bill not eligible (requires Honorable)", testName);
      assert(results.homeLoan.eligible, "Home loan eligible (>= 181 days peacetime)", testName);
      assert(
        results.warnings.some(w => w.includes("discharge upgrade")),
        "Warning about discharge upgrade for GI Bill",
        testName
      );
    }
  },

  {
    name: "OTH discharge (reduced eligibility with warning)",
    dd214: createDD214({
      characterOfDischarge: "Other Than Honorable",
      enteredActiveDuty: "2008-05-15",
      separationDate: "2012-05-15"
    }),
    questionnaire: {
      conditions: ["Back pain"],
      disabilityRating: 15
    },
    assertions: (results) => {
      const testName = "OTH discharge";
      assert(results.disabilityComp.eligible, "Disability comp eligible (Character of Service determination)", testName);
      assert(results.healthcare.eligible, "Healthcare eligible (Character of Service determination)", testName);
      assert(!results.education.eligible, "GI Bill not eligible (OTH disqualifies)", testName);
      assert(!results.homeLoan.eligible, "Home loan not eligible (OTH disqualifies)", testName);
      assert(
        results.disabilityComp.details.some(d => d.includes("Character of Service")),
        "Character of Service explanation included",
        testName
      );
    }
  },

  {
    name: "Dishonorable discharge (no benefits)",
    dd214: createDD214({
      characterOfDischarge: "Dishonorable"
    }),
    questionnaire: {
      conditions: [],
      disabilityRating: 0
    },
    assertions: (results) => {
      const testName = "Dishonorable discharge";
      assert(!results.disabilityComp.eligible, "Disability comp not eligible", testName);
      assert(!results.healthcare.eligible, "Healthcare not eligible", testName);
      assert(!results.education.eligible, "GI Bill not eligible", testName);
      assert(!results.homeLoan.eligible, "Home loan not eligible", testName);
      assert(
        results.warnings.some(w => w.includes("Dishonorable")),
        "Warning about dishonorable discharge",
        testName
      );
    }
  },

  {
    name: "Bad Conduct discharge (partial eligibility with warning)",
    dd214: createDD214({
      characterOfDischarge: "Bad Conduct"
    }),
    questionnaire: {
      conditions: [],
      disabilityRating: 0
    },
    assertions: (results) => {
      const testName = "Bad Conduct discharge";
      assert(results.disabilityComp.eligible, "Disability comp potentially eligible (Character review)", testName);
      assert(
        results.warnings.some(w => w.includes("Bad Conduct")),
        "Warning about BCD and Character determination",
        testName
      );
      assert(
        results.warnings.some(w => w.includes("VSO")),
        "Recommendation to consult VSO",
        testName
      );
    }
  },

  // ─── OCCUPATIONAL/MOS TESTS ────────────────────────────────────────

  {
    name: "Infantry MOS (noise exposure presumptive)",
    dd214: createDD214({
      mos: "11B - Infantryman",
      enteredActiveDuty: "2004-06-01",
      separationDate: "2009-06-01",
      dutyLocations: "Fort Benning, Iraq"
    }),
    questionnaire: {
      conditions: ["Tinnitus", "Bilateral Hearing Loss"],
      disabilityRating: 20
    },
    assertions: (results) => {
      const testName = "Infantry noise exposure";
      assert(
        results.disabilityComp.presumptiveConditions!.some(p => p.category.includes("Noise Exposure")),
        "Noise exposure presumptive detected for 11B MOS",
        testName
      );
      assert(
        results.disabilityComp.presumptiveConditions![0].conditions.some(c => c.includes("Tinnitus")),
        "Tinnitus in presumptive conditions",
        testName
      );
    }
  },

  // ─── CAMP LEJEUNE TESTS ─────────────────────────────────────────────

  {
    name: "Camp Lejeune veteran",
    dd214: createDD214({
      branch: "Marines",
      mos: "0311 - Rifleman",
      enteredActiveDuty: "1975-03-01",
      separationDate: "1979-03-01",
      dutyLocations: "Camp Lejeune, North Carolina",
      remarks: "Stationed at Camp Lejeune"
    }),
    questionnaire: {
      servedCampLejeune: true,
      campLejeuneConditions: ["Bladder cancer", "Kidney disease"],
      disabilityRating: 50
    },
    assertions: (results) => {
      const testName = "Camp Lejeune";
      assert(
        results.disabilityComp.presumptiveConditions!.some(p => p.category.includes("Camp Lejeune")),
        "Camp Lejeune presumptive detected",
        testName
      );
    }
  },

  // ─── MILITARY SEXUAL TRAUMA (MST) TESTS ─────────────────────────────

  {
    name: "MST case (special forms, no incident report required)",
    dd214: createDD214({
      enteredActiveDuty: "2000-07-15",
      separationDate: "2006-07-15"
    }),
    questionnaire: {
      experiencedMST: true,
      mstConditions: ["PTSD", "Depression", "Anxiety"],
      conditions: ["PTSD"],
      disabilityRating: 30,
      hasPrivateMedical: false
    },
    assertions: (results) => {
      const testName = "MST case";
      assert(
        results.disabilityComp.forms.some(f => f.form === "VA Form 21-0781"),
        "MST-specific 21-0781 form recommended",
        testName
      );
      assert(
        results.disabilityComp.forms.find(f => f.form === "VA Form 21-0781")?.priority === "critical",
        "21-0781 marked as critical priority for MST",
        testName
      );
      assert(
        results.disabilityComp.details.some(d => d.includes("do NOT need")),
        "Details emphasize no incident report needed",
        testName
      );
      assert(
        results.recommendations.some(r => r.includes("MST")),
        "MST special consideration in recommendations",
        testName
      );
    }
  },

  // ─── TDIU (CANNOT WORK) TESTS ───────────────────────────────────────

  {
    name: "TDIU case (cannot work - 100% equivalent)",
    dd214: createDD214({
      enteredActiveDuty: "1999-01-10",
      separationDate: "2005-01-10"
    }),
    questionnaire: {
      conditions: ["Severe PTSD", "Service-connected Back Injury"],
      disabilityRating: 50,
      cannotWork: true
    },
    assertions: (results) => {
      const testName = "TDIU";
      assert(
        results.disabilityComp.forms.some(f => f.form === "VA Form 21-8940"),
        "TDIU form 21-8940 recommended",
        testName
      );
      assert(
        results.disabilityComp.forms.find(f => f.form === "VA Form 21-8940")?.reason.includes("100%"),
        "TDIU form explains 100% compensation",
        testName
      );
      assert(
        results.vocRehab.eligible,
        "Vocational rehab eligible (disabilityRating > 0 and cannotWork)",
        testName
      );
      assert(
        results.vocRehab.details.some(d => d.includes("HIGHLY RECOMMENDED")),
        "Voc rehab marked as highly recommended for TDIU",
        testName
      );
    }
  },

  // ─── PURPLE HEART TESTS ─────────────────────────────────────────────

  {
    name: "Purple Heart recipient (healthcare priority)",
    dd214: createDD214({
      enteredActiveDuty: "2006-04-20",
      separationDate: "2008-04-20",
      decorations: "Purple Heart, Bronze Star",
      dutyLocations: "Baghdad, Iraq"
    }),
    questionnaire: {
      conditions: ["PTSD"],
      disabilityRating: 0
    },
    assertions: (results) => {
      const testName = "Purple Heart";
      assert(
        results.healthcare.priorityGroup === 3,
        "Purple Heart qualifies for Priority Group 3",
        testName
      );
      assert(
        results.healthcare.details.some(d => d.includes("Purple Heart") && d.includes("Priority Group 3")),
        "Purple Heart priority explanation included",
        testName
      );
      assert(
        results.homeLoan.details.some(d => d.includes("funding fee exemption")),
        "Funding fee exemption noted for Purple Heart",
        testName
      );
    }
  },

  // ─── SHORT SERVICE TESTS ────────────────────────────────────────────

  {
    name: "Short wartime service (< 90 days, no home loan)",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "1991-02-15",
      separationDate: "1991-05-15", // 90 days during Gulf War
      dutyLocations: "Saudi Arabia",
      remarks: "Gulf War service"
    }),
    questionnaire: {
      conditions: [],
      disabilityRating: 0
    },
    assertions: (results) => {
      const testName = "Short wartime service";
      assert(!results.homeLoan.eligible, "Home loan not eligible (< 90 days wartime)", testName);
    }
  },

  {
    name: "Peacetime service 181+ days (home loan eligible)",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "2016-01-01",
      separationDate: "2016-07-01", // 181 days peacetime
      dutyLocations: "Fort Hood"
    }),
    questionnaire: {
      conditions: [],
      disabilityRating: 0
    },
    assertions: (results) => {
      const testName = "Peacetime 181+ days";
      assert(results.homeLoan.eligible, "Home loan eligible (>= 181 days peacetime)", testName);
    }
  },

  // ─── GI BILL TIER TESTS ─────────────────────────────────────────────

  {
    name: "GI Bill tier calculations - 36+ months post-9/11 (100%)",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "2001-10-01",
      separationDate: "2005-10-01" // 48 months post-9/11
    }),
    questionnaire: {
      conditions: [],
      disabilityRating: 0
    },
    assertions: (results) => {
      const testName = "GI Bill 36+ months";
      assert(results.education.eligible, "GI Bill eligible", testName);
      assert(results.education.tier?.percentage === 100, "100% GI Bill for 36+ months", testName);
    }
  },

  {
    name: "GI Bill tier calculations - 24-30 months post-9/11 (90%)",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "2003-01-15",
      separationDate: "2005-07-15" // 30 months post-9/11
    }),
    questionnaire: {
      conditions: [],
      disabilityRating: 0
    },
    assertions: (results) => {
      const testName = "GI Bill 24-30 months";
      assert(results.education.eligible, "GI Bill eligible", testName);
      assert(results.education.tier?.percentage === 90, "90% GI Bill for 30 months", testName);
    }
  },

  {
    name: "GI Bill tier calculations - 12-18 months post-9/11 (70%)",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "2012-01-01",
      separationDate: "2013-07-01" // 18 months post-9/11
    }),
    questionnaire: {
      conditions: [],
      disabilityRating: 0
    },
    assertions: (results) => {
      const testName = "GI Bill 12-18 months";
      assert(results.education.eligible, "GI Bill eligible", testName);
      assert(results.education.tier?.percentage === 70, "70% GI Bill for 18 months", testName);
    }
  },

  {
    name: "GI Bill tier calculations - 3-6 months post-9/11 (40-50%)",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "2020-01-01",
      separationDate: "2020-04-01" // 3 months post-9/11
    }),
    questionnaire: {
      conditions: [],
      disabilityRating: 0
    },
    assertions: (results) => {
      const testName = "GI Bill 3-6 months";
      assert(results.education.eligible, "GI Bill eligible", testName);
      assert(results.education.tier?.percentage === 40, "40% GI Bill for 3 months", testName);
    }
  },

  {
    name: "GI Bill < 3 months (not eligible)",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "2020-01-01",
      separationDate: "2020-02-01" // 1 month post-9/11
    }),
    questionnaire: {
      conditions: [],
      disabilityRating: 0
    },
    assertions: (results) => {
      const testName = "GI Bill < 3 months";
      assert(!results.education.eligible, "GI Bill not eligible (< 3 months post-9/11)", testName);
    }
  },

  // ─── SECONDARY CONDITIONS TESTS ─────────────────────────────────────

  {
    name: "Secondary conditions detection (back pain → depression, anxiety)",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "2000-01-01",
      separationDate: "2006-01-01"
    }),
    questionnaire: {
      conditions: ["Back injury", "chronic pain", "Depression", "Sleep disorder"],
      disabilityRating: 30,
      hasSecondaryConditions: false
    },
    assertions: (results) => {
      const testName = "Secondary conditions detection";
      assert(results.secondaryConditions.eligible, "Secondary conditions detected auto", testName);
      assert(
        results.secondaryConditions.details.some(d => d.includes("Back injury") && d.includes("Depression")),
        "Back pain → depression linkage detected",
        testName
      );
    }
  },

  {
    name: "Secondary conditions with explicit pairs",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "1998-06-01",
      separationDate: "2004-06-01"
    }),
    questionnaire: {
      conditions: ["Diabetes", "PTSD"],
      disabilityRating: 40,
      hasSecondaryConditions: true,
      secondaryPairs: [
        { primary: "Diabetes (Type 2)", secondary: "Peripheral neuropathy" },
        { primary: "PTSD", secondary: "Sleep apnea" }
      ]
    },
    assertions: (results) => {
      const testName = "Explicit secondary pairs";
      assert(results.secondaryConditions.eligible, "Secondary conditions eligible", testName);
      assert(
        results.secondaryConditions.details.length >= 2,
        "Multiple secondary pair details included",
        testName
      );
    }
  },

  // ─── AID & ATTENDANCE TESTS ─────────────────────────────────────────

  {
    name: "Aid & Attendance case",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "1990-01-01",
      separationDate: "1996-01-01"
    }),
    questionnaire: {
      conditions: ["Severe vision loss", "Mobility limitation"],
      disabilityRating: 70,
      needsAidAttendance: true,
      aidAttendanceNeeds: ["bathing", "dressing", "grooming"]
    },
    assertions: (results) => {
      const testName = "Aid & Attendance";
      assert(results.aidAttendance.eligible, "A&A eligible", testName);
      assert(
        results.aidAttendance.forms.some(f => f.form === "VA Form 21-2680"),
        "A&A form 21-2680 recommended",
        testName
      );
      assert(
        results.aidAttendance.details.some(d => d.includes("bathing") || d.includes("dressing")),
        "A&A needs listed in details",
        testName
      );
      assert(
        results.recommendations.some(r => r.includes("AID & ATTENDANCE")),
        "A&A in recommendations",
        testName
      );
    }
  },

  // ─── VOCATIONAL REHAB TESTS ────────────────────────────────────────

  {
    name: "Voc Rehab eligibility (10%+ disability)",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "2005-03-01",
      separationDate: "2011-03-01"
    }),
    questionnaire: {
      conditions: ["Service-connected Back Injury"],
      disabilityRating: 10
    },
    assertions: (results) => {
      const testName = "Voc Rehab 10%";
      assert(results.vocRehab.eligible, "Voc rehab eligible (10% rating)", testName);
      assert(
        results.vocRehab.forms.some(f => f.form === "VA Form 28-1900"),
        "Voc rehab form 28-1900 recommended",
        testName
      );
      assert(
        results.vocRehab.details.some(d => d.includes("12 years")),
        "12-year delimiting period mentioned",
        testName
      );
    }
  },

  {
    name: "Voc Rehab - severe employment handicap (0% + cannotWork)",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "2010-06-01",
      separationDate: "2014-06-01"
    }),
    questionnaire: {
      conditions: ["Non-service-connected severe illness"],
      disabilityRating: 0,
      cannotWork: true
    },
    assertions: (results) => {
      const testName = "Voc Rehab employment handicap";
      assert(!results.vocRehab.eligible, "Voc rehab not eligible (0% rating, not SC)", testName);
    }
  },

  // ─── PRIORITY GROUP TESTS ───────────────────────────────────────────

  {
    name: "Priority Group 1 (50%+ disability)",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "2000-01-01",
      separationDate: "2006-01-01"
    }),
    questionnaire: {
      conditions: ["Service-connected disability"],
      disabilityRating: 50
    },
    assertions: (results) => {
      const testName = "Priority Group 1";
      assert(results.healthcare.priorityGroup === 1, "PG 1 for 50%+ rating", testName);
    }
  },

  {
    name: "Priority Group 2 (30-40% disability)",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "2000-01-01",
      separationDate: "2006-01-01"
    }),
    questionnaire: {
      conditions: ["Service-connected disability"],
      disabilityRating: 40
    },
    assertions: (results) => {
      const testName = "Priority Group 2";
      assert(results.healthcare.priorityGroup === 2, "PG 2 for 30-40% rating", testName);
    }
  },

  {
    name: "Priority Group 3 (10-20% disability)",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "2000-01-01",
      separationDate: "2006-01-01"
    }),
    questionnaire: {
      conditions: ["Service-connected disability"],
      disabilityRating: 20
    },
    assertions: (results) => {
      const testName = "Priority Group 3";
      assert(results.healthcare.priorityGroup === 3, "PG 3 for 10-20% rating", testName);
    }
  },

  // ─── FORM RECOMMENDATIONS TESTS ─────────────────────────────────────

  {
    name: "Medical records release forms (private medical)",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "2000-01-01",
      separationDate: "2006-01-01"
    }),
    questionnaire: {
      conditions: ["Back pain"],
      disabilityRating: 20,
      hasPrivateMedical: true
    },
    assertions: (results) => {
      const testName = "Private medical forms";
      assert(
        results.disabilityComp.forms.some(f => f.form === "VA Form 21-4142"),
        "Form 21-4142 (medical release) recommended",
        testName
      );
      assert(
        results.disabilityComp.forms.some(f => f.form === "VA Form 21-4142a"),
        "Form 21-4142a (provider info) recommended",
        testName
      );
    }
  },

  {
    name: "PTSD form when claiming PTSD",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "2005-01-01",
      separationDate: "2011-01-01",
      dutyLocations: "Iraq"
    }),
    questionnaire: {
      conditions: ["PTSD"],
      disabilityRating: 30,
      hasPTSD: true
    },
    assertions: (results) => {
      const testName = "PTSD form";
      const ptsdForm = results.disabilityComp.forms.find(f => f.form === "VA Form 21-0781") as FormRecommendation | undefined;
      assert(!!ptsdForm, "Form 21-0781 (PTSD) recommended", testName);
      assert(
        ptsdForm && ptsdForm.reason.includes("stressor"),
        "PTSD form reason mentions stressor events",
        testName
      );
    }
  },

  {
    name: "Buddy statements documentation",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "2006-06-01",
      separationDate: "2010-06-01"
    }),
    questionnaire: {
      conditions: ["PTSD"],
      disabilityRating: 30,
      hasBuddyStatements: true
    },
    assertions: (results) => {
      const testName = "Buddy statements";
      assert(
        results.disabilityComp.docs.some(d => d.includes("Buddy")),
        "Buddy statements listed in required docs",
        testName
      );
    }
  },

  // ─── INTENT TO FILE RECOMMENDATION ──────────────────────────────────

  {
    name: "Intent to File recommendation (not yet filed)",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "2000-01-01",
      separationDate: "2006-01-01"
    }),
    questionnaire: {
      conditions: ["Back pain"],
      disabilityRating: 0,
      hasFiledIntentToFile: false
    },
    assertions: (results) => {
      const testName = "Intent to File recommendation";
      assert(
        results.recommendations[0].includes("FILE INTENT TO FILE"),
        "Intent to File at top of recommendations",
        testName
      );
      assert(
        results.recommendations[0].includes("TODAY"),
        "Urgency emphasized",
        testName
      );
    }
  },

  {
    name: "No Intent to File recommendation (already filed)",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "2000-01-01",
      separationDate: "2006-01-01"
    }),
    questionnaire: {
      conditions: ["Back pain"],
      disabilityRating: 0,
      hasFiledIntentToFile: true
    },
    assertions: (results) => {
      const testName = "Already filed Intent to File";
      assert(
        !results.recommendations.some(r => r.includes("FILE INTENT TO FILE")),
        "No Intent to File recommendation when already filed",
        testName
      );
    }
  },

  // ─── DISABILITY SEPARATION (100% GI BILL) ─────────────────────────

  {
    name: "GI Bill 100% for disability discharge (any length)",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "2020-01-01",
      separationDate: "2020-02-01", // Only 1 month
      narrativeReason: "Discharged due to disability"
    }),
    questionnaire: {
      conditions: ["Service-connected disability"],
      disabilityRating: 30
    },
    assertions: (results) => {
      const testName = "Disability discharge GI Bill";
      assert(results.education.eligible, "GI Bill eligible", testName);
      assert(
        results.education.tier?.percentage === 100,
        "100% GI Bill for disability discharge",
        testName
      );
      assert(
        results.education.details.some(d => d.includes("disability")),
        "Disability discharge explanation included",
        testName
      );
    }
  },

  // ─── COMBAT SERVICE POST-9/11 HEALTHCARE BOOST ──────────────────────

  {
    name: "Combat veteran healthcare boost (10 years post-separation)",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "2008-01-01",
      separationDate: "2012-01-01", // 14 years ago (in 2026)
      decorations: "Bronze Star, Combat Infantryman Badge"
    }),
    questionnaire: {
      conditions: [],
      disabilityRating: 0
    },
    assertions: (results) => {
      const testName = "Combat veteran boost expired";
      // 2026 - 2012 = 14 years, so boost has expired
      assert(
        results.healthcare.priorityGroup !== 6,
        "Combat boost not applied after 10 years",
        testName
      );
    }
  },

  // ─── MULTIPLE PRESUMPTIVE TRIGGERS ──────────────────────────────────

  {
    name: "Multiple presumptive triggers (Vietnam + radiation exposure)",
    dd214: createDD214({
      characterOfDischarge: "Honorable",
      enteredActiveDuty: "1970-01-01",
      separationDate: "1972-01-01",
      dutyLocations: "Vietnam, Enewetak Atoll",
      remarks: "Deployed to Vietnam and Enewetak"
    }),
    questionnaire: {
      conditions: ["Type 2 Diabetes", "Thyroid cancer"],
      disabilityRating: 50,
      radiationExposure: true,
      radiationActivity: "Enewetak Atoll"
    },
    assertions: (results) => {
      const testName = "Multiple presumptives";
      assert(
        results.disabilityComp.presumptiveConditions!.length >= 2,
        "Multiple presumptive categories detected",
        testName
      );
      assert(
        results.disabilityComp.presumptiveConditions!.some(p => p.category.includes("Agent Orange")),
        "Agent Orange presumptive detected",
        testName
      );
      assert(
        results.disabilityComp.presumptiveConditions!.some(p => p.category.includes("Radiation")),
        "Radiation presumptive detected",
        testName
      );
    }
  }
];

// ─── RUN ALL TESTS ───────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════════════════");
console.log("  VA RULES ENGINE - COMPREHENSIVE TEST SUITE");
console.log("═══════════════════════════════════════════════════════════");

testCases.forEach(testCase => {
  runTest(testCase);
});

// ─── TEST SUMMARY ────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log("  TEST SUMMARY");
console.log("═══════════════════════════════════════════════════════════");
console.log(`Total Tests: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

if (failedTests.length > 0) {
  console.log("\nFAILED TEST DETAILS:");
  failedTests.forEach(failure => {
    console.log(`  - ${failure}`);
  });
}

// @ts-ignore
if (typeof process !== 'undefined') {
  // @ts-ignore
  process.exit(testsFailed > 0 ? 1 : 0);
}
