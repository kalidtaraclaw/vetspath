export interface StateBenefitRule {
  field: string; // e.g., "disabilityRating", "characterOfDischarge", "branch", "serviceMonths"
  operator: "gte" | "lte" | "gt" | "lt" | "eq" | "neq" | "in" | "not_in" | "contains" | "exists" | "not_exists" | "true" | "false";
  value: number | string | string[] | boolean;
}

export interface StateBenefit {
  id: string;
  state: string;
  category: "property-tax" | "education" | "income-tax" | "employment" | "recreation" | "housing-care";
  name: string;
  description: string;
  estimatedValue: string; // e.g., "$4,000/year", "Full tuition", "Varies"
  eligibility: StateBenefitRule[];
  sourceUrl: string;
  lastUpdated: string; // ISO date
  notes?: string;
}

export interface StateBenefitsData {
  state: string;
  stateName: string;
  lastUpdated: string;
  benefits: StateBenefit[];
}

export interface MatchedStateBenefit extends StateBenefit {
  matchScore: number; // 0-100, how many rules matched
  matchDetails: string[];
}
