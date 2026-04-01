"use client";

import { type MatchedStateBenefit } from "@/lib/state-benefits/types";

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

// ─── CATEGORY MAPPING ───────────────────────────────────────────────────

const categoryIcons: Record<
  "property-tax" | "education" | "income-tax" | "employment" | "recreation" | "housing-care",
  string
> = {
  "property-tax": "🏠",
  education: "🎓",
  "income-tax": "💰",
  employment: "💼",
  recreation: "🎣",
  "housing-care": "🏥",
};

const categoryLabels: Record<
  "property-tax" | "education" | "income-tax" | "employment" | "recreation" | "housing-care",
  string
> = {
  "property-tax": "Property Tax",
  education: "Education",
  "income-tax": "Income Tax",
  employment: "Employment",
  recreation: "Recreation",
  "housing-care": "Housing & Care",
};

// ─── STATE FLAGS ────────────────────────────────────────────────────────

const stateFlags: Record<string, string> = {
  AL: "🇦🇱",
  AK: "🇦🇰",
  AZ: "🇦🇿",
  AR: "🇦🇷",
  CA: "🇨🇦",
  CO: "🇨🇴",
  CT: "🇨🇹",
  DE: "🇩🇪",
  FL: "🇫🇮",
  GA: "🇬🇦",
  HI: "🇭🇮",
  ID: "🇮🇩",
  IL: "🇮🇱",
  IN: "🇮🇳",
  IA: "🇮🇦",
  KS: "🇰🇷",
  KY: "🇰🇪",
  LA: "🇱🇦",
  ME: "🇲🇪",
  MD: "🇲🇩",
  MA: "🇲🇦",
  MI: "🇲🇮",
  MN: "🇲🇳",
  MS: "🇲🇸",
  MO: "🇲🇴",
  MT: "🇲🇹",
  NE: "🇳🇪",
  NV: "🇳🇻",
  NH: "🇳🇭",
  NJ: "🇳🇯",
  NM: "🇳🇲",
  NY: "🇳🇾",
  NC: "🇳🇨",
  ND: "🇳🇩",
  OH: "🇴🇭",
  OK: "🇴🇰",
  OR: "🇴🇷",
  PA: "🇵🇦",
  RI: "🇷🇮",
  SC: "🇸🇨",
  SD: "🇸🇩",
  TN: "🇹🇳",
  TX: "🇹🇽",
  UT: "🇺🇹",
  VT: "🇻🇹",
  VA: "🇻🇦",
  WA: "🇼🇦",
  WV: "🇼🇻",
  WI: "🇼🇮",
  WY: "🇼🇾",
};

// ─── PROPS INTERFACE ────────────────────────────────────────────────────

interface StateBenefitsProps {
  benefits: MatchedStateBenefit[];
  stateName: string;
  stateCode: string;
}

// ─── COMPONENT ──────────────────────────────────────────────────────────

export default function StateBenefits({
  benefits,
  stateName,
  stateCode,
}: StateBenefitsProps) {
  // Group benefits by category
  const groupedBenefits = benefits.reduce(
    (acc, benefit) => {
      const cat = benefit.category;
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(benefit);
      return acc;
    },
    {} as Record<string, MatchedStateBenefit[]>
  );

  // Ensure consistent category order
  const categoryOrder = [
    "property-tax",
    "education",
    "income-tax",
    "employment",
    "recreation",
    "housing-care",
  ] as const;
  const sortedCategories = categoryOrder.filter((cat) => groupedBenefits[cat]);

  const stateFlag = stateFlags[stateCode] || "🇺🇸";

  // Empty state
  if (benefits.length === 0) {
    return (
      <section
        style={{
          backgroundColor: brand.offwhite,
          borderRadius: "12px",
          padding: "32px",
          border: `1px solid ${brand.silver}`,
        }}
      >
        <h2
          style={{
            fontSize: "20px",
            fontWeight: "700",
            color: brand.midnight,
            marginBottom: "12px",
          }}
        >
          {stateFlag} {stateName} State Benefits
        </h2>
        <div
          style={{
            backgroundColor: "#FFF8E1",
            borderLeft: `4px solid #FFC107`,
            padding: "16px",
            borderRadius: "8px",
            marginTop: "16px",
          }}
        >
          <p
            style={{
              fontSize: "14px",
              color: "#856404",
              margin: "0",
            }}
          >
            State benefits are not yet available for {stateName}. Check back soon as we expand our coverage.
          </p>
        </div>
      </section>
    );
  }

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "28px",
        }}
      >
        <h2
          style={{
            fontSize: "20px",
            fontWeight: "700",
            color: brand.midnight,
            margin: "0",
          }}
        >
          {stateFlag} {stateName} State Benefits
        </h2>
        <div
          style={{
            backgroundColor: brand.azure,
            color: brand.white,
            padding: "6px 12px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "600",
          }}
        >
          {benefits.length} benefits found
        </div>
      </div>

      {/* Categories */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {sortedCategories.map((category) => {
          const categoryBenefits = groupedBenefits[category] || [];
          const icon = categoryIcons[category];
          const label = categoryLabels[category];

          return (
            <div key={category}>
              {/* Category Subheader */}
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: brand.royal,
                  marginBottom: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span style={{ fontSize: "18px" }}>{icon}</span>
                {label}
              </h3>

              {/* Category Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: "16px",
                }}
              >
                {categoryBenefits.map((benefit) => (
                  <BenefitCard key={benefit.id} benefit={benefit} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div
        style={{
          backgroundColor: "#E3F2FD",
          borderLeft: `4px solid ${brand.azure}`,
          padding: "16px",
          borderRadius: "8px",
          marginTop: "28px",
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
          State benefits change frequently. Verify eligibility directly with your state VA office.
        </p>
      </div>
    </section>
  );
}

// ─── BENEFIT CARD COMPONENT ─────────────────────────────────────────────

interface BenefitCardProps {
  benefit: MatchedStateBenefit;
}

function BenefitCard({ benefit }: BenefitCardProps) {
  const isFullyQualified = benefit.matchScore === 100;
  const qualificationColor = isFullyQualified ? "#10B981" : "#F59E0B";
  const qualificationBg = isFullyQualified ? "#ECFDF5" : "#FFFBEB";
  const qualificationText = isFullyQualified ? "QUALIFIES" : "MAY QUALIFY";

  // Format last updated date
  const lastUpdated = new Date(benefit.lastUpdated).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div
      style={{
        backgroundColor: brand.white,
        border: `1px solid ${brand.silver}`,
        borderRadius: "8px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        transition: "box-shadow 0.2s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 4px 12px rgba(3, 9, 64, 0.1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {/* Benefit Name */}
      <h4
        style={{
          fontSize: "14px",
          fontWeight: "700",
          color: brand.midnight,
          margin: "0",
        }}
      >
        {benefit.name}
      </h4>

      {/* Description */}
      <p
        style={{
          fontSize: "13px",
          color: "#4B5563",
          margin: "0",
          lineHeight: "1.4",
        }}
      >
        {benefit.description}
      </p>

      {/* Badges Row */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        {/* Estimated Value Badge */}
        <div
          style={{
            backgroundColor: "#D1FAE5",
            color: "#065F46",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: "600",
          }}
        >
          {benefit.estimatedValue}
        </div>

        {/* Match Score Badge */}
        <div
          style={{
            backgroundColor: qualificationBg,
            color: qualificationColor,
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "11px",
            fontWeight: "600",
          }}
        >
          {qualificationText}
        </div>
      </div>

      {/* Unmatched Rules (if any) */}
      {benefit.matchScore < 100 && benefit.matchDetails.length > 0 && (
        <div
          style={{
            backgroundColor: "#FEE2E2",
            padding: "8px",
            borderRadius: "4px",
            fontSize: "11px",
            color: "#7F1D1D",
            lineHeight: "1.4",
          }}
        >
          <strong>Eligibility gaps:</strong> {benefit.matchDetails.join(", ")}
        </div>
      )}

      {/* Last Updated */}
      <p
        style={{
          fontSize: "11px",
          color: "#9CA3AF",
          margin: "0",
          marginTop: "4px",
        }}
      >
        Updated {lastUpdated}
      </p>

      {/* Learn More Link */}
      <a
        href={benefit.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: "12px",
          color: brand.azure,
          textDecoration: "none",
          fontWeight: "600",
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          marginTop: "4px",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.color = brand.royal;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.color = brand.azure;
        }}
      >
        Learn more →
      </a>
    </div>
  );
}
