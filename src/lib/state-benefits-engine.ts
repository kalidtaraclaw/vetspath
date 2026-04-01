/**
 * State Benefits Evaluation Engine
 * Evaluates veteran eligibility for state-specific benefits based on DD-214 and questionnaire data
 */

import type {
  StateBenefit,
  StateBenefitRule,
  MatchedStateBenefit,
} from './state-benefits/types';
import { getStateBenefits } from './state-benefits';
import { zipToState } from './zip-to-state';
import type { DD214Data, QuestionnaireData } from './rules-engine';

/**
 * Veteran profile used for benefits evaluation
 */
export interface StateBenefitProfile {
  stateCode: string;
  disabilityRating: number;
  characterOfDischarge: string;
  branch: string;
  serviceMonths: number;
  combatVeteran: boolean;
  campLejeune: boolean;
  residency: boolean;
  hasPTSD?: boolean;
  hasTBI?: boolean;
  hasTinnitus?: boolean;
  hasHearingLoss?: boolean;
  cannotWork?: boolean;
}

/**
 * Calculate service months from entered active duty and separation dates
 * @param enteredDate - ISO date string of entry
 * @param separationDate - ISO date string of separation
 * @returns Number of months of service
 */
function calculateServiceMonths(enteredDate: string, separationDate: string): number {
  try {
    const entered = new Date(enteredDate);
    const separated = new Date(separationDate);
    const diffMs = separated.getTime() - entered.getTime();
    // 30.44 is the average days per month
    return Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.44));
  } catch {
    return 0;
  }
}

/**
 * Detect if veteran is a combat veteran based on duty locations and decorations
 * @param dutyLocations - Comma-separated or space-separated duty locations
 * @param decorations - Comma-separated or space-separated decorations/medals
 * @param remarks - Additional remarks field
 * @returns True if combat indicators found
 */
function detectCombatVeteran(
  dutyLocations: string = '',
  decorations: string = '',
  remarks: string = ''
): boolean {
  const combatIndicators = [
    'combat',
    'iraq',
    'afghanistan',
    'vietnam',
    'korea',
    'oif',
    'oef',
    'operation enduring freedom',
    'operation iraqi freedom',
    'combat zone',
    'hostile fire',
  ];

  const allText = (
    (dutyLocations || '') +
    ' ' +
    (decorations || '') +
    ' ' +
    (remarks || '')
  ).toLowerCase();

  return combatIndicators.some((indicator) => allText.includes(indicator));
}

/**
 * Detect if veteran was exposed to Camp Lejeune contaminated water
 * @param servedCampLejeune - Questionnaire response about Camp Lejeune exposure
 * @param dutyLocations - Duty locations from DD-214
 * @returns True if Camp Lejeune exposure detected
 */
function detectCampLejeune(
  servedCampLejeune: boolean | undefined,
  dutyLocations: string = ''
): boolean {
  if (servedCampLejeune === true) return true;

  const locations = dutyLocations.toLowerCase();
  return locations.includes('camp lejeune') || locations.includes('lejeune');
}

/**
 * Build a benefit evaluation profile from DD-214 and questionnaire data
 * @param dd214 - DD-214 discharge document data
 * @param questionnaire - Questionnaire responses
 * @param stateCode - State abbreviation (e.g., "TX")
 * @returns Profile object for benefit evaluation
 */
export function buildProfileFromData(
  dd214: DD214Data,
  questionnaire: QuestionnaireData,
  stateCode: string
): StateBenefitProfile {
  const serviceMonths = calculateServiceMonths(dd214.enteredActiveDuty, dd214.separationDate);
  const combatVeteran = detectCombatVeteran(dd214.dutyLocations, dd214.decorations, dd214.remarks);
  const campLejeune = detectCampLejeune(questionnaire.servedCampLejeune, dd214.dutyLocations);

  return {
    stateCode,
    disabilityRating: questionnaire.disabilityRating || 0,
    characterOfDischarge: dd214.characterOfDischarge || '',
    branch: dd214.branch || '',
    serviceMonths,
    combatVeteran,
    campLejeune,
    residency: true, // Always true since they provided state
    hasPTSD: questionnaire.hasPTSD,
    hasTBI: questionnaire.hasTBI,
    hasTinnitus: questionnaire.hasTinnitus,
    hasHearingLoss: questionnaire.hasHearingLoss,
    cannotWork: questionnaire.cannotWork,
  };
}

/**
 * Evaluate a single rule against the veteran's profile
 * @param rule - The eligibility rule to evaluate
 * @param profile - The veteran's benefit profile
 * @returns True if the rule is satisfied
 */
function evaluateRule(rule: StateBenefitRule, profile: StateBenefitProfile): boolean {
  const fieldValue = (profile as unknown as Record<string, unknown>)[rule.field];

  switch (rule.operator) {
    case 'gte':
      return typeof fieldValue === 'number' && fieldValue >= (rule.value as number);

    case 'lte':
      return typeof fieldValue === 'number' && fieldValue <= (rule.value as number);

    case 'gt':
      return typeof fieldValue === 'number' && fieldValue > (rule.value as number);

    case 'lt':
      return typeof fieldValue === 'number' && fieldValue < (rule.value as number);

    case 'eq':
      return fieldValue === rule.value;

    case 'neq':
      return fieldValue !== rule.value;

    case 'in':
      return Array.isArray(rule.value) && rule.value.includes(fieldValue as string);

    case 'not_in':
      return Array.isArray(rule.value) && !rule.value.includes(fieldValue as string);

    case 'contains':
      return (
        typeof fieldValue === 'string' &&
        typeof rule.value === 'string' &&
        fieldValue.includes(rule.value)
      );

    case 'exists':
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';

    case 'not_exists':
      return fieldValue === undefined || fieldValue === null || fieldValue === '';

    case 'true':
      return fieldValue === true;

    case 'false':
      return fieldValue === false;

    default:
      return false;
  }
}

/**
 * Evaluate all state benefits for a veteran based on their profile
 * @param dd214 - DD-214 discharge document data
 * @param questionnaire - Questionnaire responses
 * @param stateInput - State code (2 letters) or ZIP code (5 digits)
 * @returns Array of matched benefits sorted by match score
 */
export function evaluateStateBenefits(
  dd214: DD214Data,
  questionnaire: QuestionnaireData,
  stateInput: string
): MatchedStateBenefit[] {
  if (!stateInput) return [];

  // Resolve state from ZIP or direct code
  let stateCode = stateInput.length <= 2 ? stateInput.toUpperCase() : null;
  if (!stateCode) {
    stateCode = zipToState(stateInput);
  }
  if (!stateCode) return [];

  // Get benefits for this state
  const stateData = getStateBenefits(stateCode);
  if (!stateData) return [];

  // Build profile for evaluation
  const profile = buildProfileFromData(dd214, questionnaire, stateCode);

  const matched: MatchedStateBenefit[] = [];

  // Evaluate each benefit
  for (const benefit of stateData.benefits) {
    const totalRules = benefit.eligibility.length;
    if (totalRules === 0) continue;

    let rulesMatched = 0;
    const matchDetails: string[] = [];

    // Check each eligibility rule
    for (const rule of benefit.eligibility) {
      const ruleMatches = evaluateRule(rule, profile);

      if (ruleMatches) {
        rulesMatched++;
        matchDetails.push(`✓ ${rule.field}: meets ${rule.operator} ${JSON.stringify(rule.value)}`);
      } else {
        matchDetails.push(
          `✗ ${rule.field}: does not meet ${rule.operator} ${JSON.stringify(rule.value)}`
        );
      }
    }

    // Calculate match percentage
    const matchScore = Math.round((rulesMatched / totalRules) * 100);

    // Include benefits with at least 50% match
    // 100% = "qualifies", 50-99% = "may qualify"
    if (matchScore >= 50) {
      matched.push({
        ...benefit,
        matchScore,
        matchDetails,
      });
    }
  }

  // Sort by match score (highest first), then by category
  matched.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    return (a.category || '').localeCompare(b.category || '');
  });

  return matched;
}

/**
 * Get a summary of benefit evaluation results
 * @param matched - Array of matched benefits from evaluateStateBenefits
 * @returns Summary object with counts and categorization
 */
export interface BenefitSummary {
  totalMatched: number;
  fullyQualified: number;
  mayQualify: number;
  byCategory: Record<string, number>;
}

export function summarizeBenefits(matched: MatchedStateBenefit[]): BenefitSummary {
  const summary: BenefitSummary = {
    totalMatched: matched.length,
    fullyQualified: 0,
    mayQualify: 0,
    byCategory: {},
  };

  for (const benefit of matched) {
    if (benefit.matchScore === 100) {
      summary.fullyQualified++;
    } else {
      summary.mayQualify++;
    }

    const category = benefit.category || 'Other';
    summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;
  }

  return summary;
}

/**
 * Check if a veteran is definitely ineligible (disqualifying characteristics)
 * @param dd214 - DD-214 discharge document data
 * @returns Array of disqualifying factors (empty if eligible to apply)
 */
export function checkDisqualifyingFactors(dd214: DD214Data): string[] {
  const factors: string[] = [];

  // Dishonorable or bad conduct discharge
  const disqualifyingDischarges = ['Dishonorable', 'Bad Conduct', 'Dismissal'];
  if (disqualifyingDischarges.includes(dd214.characterOfDischarge)) {
    factors.push(
      `Discharge character of "${dd214.characterOfDischarge}" may disqualify from most VA benefits`
    );
  }

  return factors;
}
