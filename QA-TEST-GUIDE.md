# VetsPath QA Test Guide

**Version:** 1.0
**Last Updated:** March 29, 2026
**App:** VetsPath by Aquia
**Purpose:** Comprehensive walkthrough for QA testing of VA benefits eligibility flow

---

## Overview

VetsPath is a Next.js application that guides veterans through a 4-step flow to determine VA benefits eligibility based on military service data and discharge characterization. This guide provides detailed test scenarios to verify all core functionality, edge cases, and accessibility compliance.

### The 4-Step Flow
1. **DD-214 Form Entry** — Military service information input with optional OCR document upload
2. **Dynamic Questionnaire** — Conditional health/service modules based on DD-214 data
3. **Results Dashboard** — Eligibility cards for 7 benefit categories with detailed explanations
4. **Forms & Documents** — Personalized VA forms package based on eligibility

---

## How to Run the App

```bash
cd vetspath-app
npm install
npm run dev
# Open http://localhost:3000
```

The app will be available at `http://localhost:3000`.

---

## Test Profiles Available

The app includes a "Load test profile" dropdown in the header that loads pre-built test scenarios. The following profiles are available:

| Profile | Discharge Type | Branch | Service Era | Key Conditions |
|---------|---|---|---|---|
| **CPT Martinez** | Honorable | Army | Iraq (2003–2011) | Burn pits, combat, tinnitus, PTSD |
| **SGT Williams** | Bad Conduct | Army | Afghanistan | Tests BCD eligibility rules |
| **SPC Chen** | Disability Separation | Army | Recent | Very short service; tests GI Bill override |
| **SSG Johnson** | Other Than Honorable (OTH) | Marine Corps | Modern | Camp Lejeune water contamination |
| **CPL Nguyen** | General | Army | Vietnam-era | Agent Orange presumptive conditions |

---

## Test Scenarios

### Scenario 1: Happy Path — CPT Martinez

**Objective:** Verify the complete happy-path flow with an honorable discharge veteran and multiple conditions.

**Steps:**

- [ ] Load the app at `http://localhost:3000`
- [ ] Click the "Load test profile" dropdown in the header
- [ ] Select "CPT Martinez (Honorable, Army, Iraq)"
- [ ] Verify Step 1 (DD-214 Form) is auto-populated:
  - [ ] Rank: CPT
  - [ ] Branch: Army
  - [ ] Service Entry: 2003
  - [ ] Service End: 2011
  - [ ] Discharge Date: 2011
  - [ ] Character of Service: Honorable
  - [ ] MOS: 11B (Infantryman)
  - [ ] Duty: Combat, Iraq deployment
- [ ] Click "Next" or proceed to Step 2
- [ ] Verify Step 2 (Questionnaire) shows conditional modules:
  - [ ] Burns/chemical exposure module (due to Iraq service)
  - [ ] Combat exposure module
  - [ ] Service-connected disability module
  - [ ] Check for secondary conditions modules (noise exposure, etc.)
- [ ] Answer questionnaire modules (or verify defaults are pre-set)
- [ ] Proceed to Step 3 (Results Dashboard)
- [ ] **Verify eligibility results:**
  - [ ] **Disability Compensation:** ELIGIBLE
    - Detail text mentions burn pits as presumptive condition
    - Service-connected rating explanation present
  - [ ] **Healthcare:** ELIGIBLE
    - Priority Group 7 or appropriate (based on disability rating)
    - Camp Lejeune eligible status visible
  - [ ] **Education:** ELIGIBLE
    - Post-9/11 GI Bill at 100% (approximately 147 months of service)
    - Benefit amount and usage explanation shown
  - [ ] **Home Loan:** ELIGIBLE
    - Entitlement amount displayed
  - [ ] **Vocational Rehabilitation:** ELIGIBLE
    - "Cannot Work" flag indicated
  - [ ] **Secondary Conditions:** ELIGIBLE
    - Back pain → Depression link shown
    - PTSD → Sleep Apnea link shown
    - Tinnitus → Balance disorder link shown
  - [ ] **Burial Benefits:** ELIGIBLE
- [ ] Click through to Step 4 (Forms & Documents)
- [ ] **Verify forms page:**
  - [ ] Intent to File form marked as **CRITICAL**
  - [ ] All relevant forms listed (e.g., VA Form 21-0966, 21-0960, 21-0995)
  - [ ] Forms are downloadable/printable
  - [ ] Recommended next steps are clear
- [ ] **Overall verification:**
  - [ ] No errors or warnings in browser console
  - [ ] Page loads smoothly without lag
  - [ ] All text is legible and properly formatted

---

### Scenario 2: Bad Conduct Discharge — SGT Williams

**Objective:** Verify special handling for Bad Conduct Discharge (BCD) and character-of-service caveats.

**Steps:**

- [ ] Load the app
- [ ] Click "Load test profile" and select "SGT Williams (Bad Conduct, Army, Afghanistan)"
- [ ] Verify Step 1 is populated with:
  - [ ] Character of Service: **Bad Conduct Discharge**
- [ ] **Check for warning banner:**
  - [ ] Warning message visible on Step 1 (e.g., "Bad Conduct Discharge may affect benefits eligibility")
  - [ ] Text explains BCD impact on each benefit category
  - [ ] Banner is clearly styled (yellow or orange background)
- [ ] Proceed to Step 2 (Questionnaire)
- [ ] Check that questionnaire modules appear (not blocked)
- [ ] Proceed to Step 3 (Results Dashboard)
- [ ] **Verify eligibility results with BCD caveats:**
  - [ ] **Disability Compensation:** ELIGIBLE (with BCD caveat)
    - Detail text mentions "Character of Service determination required"
  - [ ] **Healthcare:** ELIGIBLE (with BCD caveat)
    - Text notes mental health care requires character review
  - [ ] **Education:** NOT ELIGIBLE
    - Reason: "Bad Conduct Discharge does not qualify for GI Bill"
    - Detail text explains discharge upgrade pathway
  - [ ] **Home Loan:** NOT ELIGIBLE
    - Reason: "Character of Service determination required"
  - [ ] **Vocational Rehabilitation:** ELIGIBLE (with BCD caveat)
    - Text mentions character review needed
- [ ] Proceed to Step 4 (Forms & Documents)
- [ ] **Verify forms include:**
  - [ ] Character of Service determination form (VA Form 21-0966 or equivalent)
  - [ ] Discharge upgrade information (if available)
  - [ ] Intent to File (if disability comp is eligible)
- [ ] **Overall verification:**
  - [ ] Warning banner remains visible throughout flow
  - [ ] No errors in console
  - [ ] BCD eligibility rules are consistently applied

---

### Scenario 3: Disability Separation, Short Service — SPC Chen

**Objective:** Verify that disability separation grants 100% GI Bill even with very short service.

**Steps:**

- [ ] Load the app
- [ ] Click "Load test profile" and select "SPC Chen (Disability Separation, Army, Recent)"
- [ ] Verify Step 1 is populated:
  - [ ] Character of Service: Honorable (or Medical Discharge)
  - [ ] Reason for Separation: Disability Separation
  - [ ] Service Length: Very short (< 3 months, e.g., 2 months)
- [ ] Proceed to Step 2 (Questionnaire)
- [ ] Check that disability-related modules appear
- [ ] Proceed to Step 3 (Results Dashboard)
- [ ] **Verify education eligibility:**
  - [ ] **Education:** ELIGIBLE
    - Post-9/11 GI Bill at **100%** (despite short service)
    - Detail text explicitly mentions "Separation for disability qualifies you for 100% GI Bill"
    - Benefit calculation shows full monthly stipend and duration
- [ ] **Verify other benefits:**
  - [ ] **Disability Compensation:** ELIGIBLE
  - [ ] **Healthcare:** ELIGIBLE
  - [ ] **Vocational Rehabilitation:** ELIGIBLE (if service-connected disability confirmed)
- [ ] Proceed to Step 4 (Forms & Documents)
- [ ] **Verify forms:**
  - [ ] Disability rating forms included
  - [ ] GI Bill enrollment information (Form 22-1990 or equivalent)
- [ ] **Overall verification:**
  - [ ] GI Bill benefit text clearly explains the disability separation exception
  - [ ] No errors in console

---

### Scenario 4: Other Than Honorable + Camp Lejeune — SSG Johnson

**Objective:** Verify OTH discharge handling and Camp Lejeune presumptive conditions.

**Steps:**

- [ ] Load the app
- [ ] Click "Load test profile" and select "SSG Johnson (Other Than Honorable, Marines, Modern)"
- [ ] Verify Step 1 is populated:
  - [ ] Character of Service: **Other Than Honorable (OTH)**
  - [ ] Branch: Marine Corps
  - [ ] Duty Station: Camp Lejeune
- [ ] **Check for OTH banner:**
  - [ ] Warning message visible explaining OTH impact
  - [ ] Note about character-of-service determination required
- [ ] Proceed to Step 2 (Questionnaire)
- [ ] Look for Camp Lejeune-specific modules:
  - [ ] Questions about water contamination exposure
  - [ ] Service at Camp Lejeune timeframe (1953–1987)
- [ ] Answer questionnaire (or verify defaults)
- [ ] Proceed to Step 3 (Results Dashboard)
- [ ] **Verify eligibility with OTH caveats:**
  - [ ] **Disability Compensation:** ELIGIBLE (with OTH caveat)
    - Text mentions character-of-service determination
    - Camp Lejeune presumptive conditions listed (e.g., bladder cancer, kidney disease, liver disease)
  - [ ] **Healthcare:** ELIGIBLE (with OTH caveat)
  - [ ] **Education:** NOT ELIGIBLE (or CONDITIONAL)
    - Text explains OTH discharge limits GI Bill eligibility
  - [ ] **Home Loan:** NOT ELIGIBLE
  - [ ] **Vocational Rehabilitation:** ELIGIBLE (with OTH caveat)
- [ ] Click through to Step 4 (Forms & Documents)
- [ ] **Verify Camp Lejeune-related forms:**
  - [ ] Camp Lejeune exposure documentation form
  - [ ] Presumptive condition claim forms
  - [ ] Intent to File form (critical)
- [ ] **Overall verification:**
  - [ ] OTH banner remains visible
  - [ ] Camp Lejeune conditions are prominently featured
  - [ ] No errors in console

---

### Scenario 5: General Discharge + Agent Orange — CPL Nguyen

**Objective:** Verify General discharge handling and Vietnam-era Agent Orange presumptive conditions.

**Steps:**

- [ ] Load the app
- [ ] Click "Load test profile" and select "CPL Nguyen (General, Army, Vietnam-era)"
- [ ] Verify Step 1 is populated:
  - [ ] Character of Service: **General**
  - [ ] Branch: Army
  - [ ] Service Era: Vietnam (1964–1973)
  - [ ] Duty: Vietnam service or adjacent area
- [ ] **Check for General discharge messaging:**
  - [ ] Note or banner explaining General discharge implications
  - [ ] Text about potential discharge upgrade benefit
- [ ] Proceed to Step 2 (Questionnaire)
- [ ] Look for Agent Orange/Vietnam-specific modules:
  - [ ] Agent Orange exposure question
  - [ ] Vietnam service location questions (DMZ, etc.)
- [ ] Answer questionnaire
- [ ] Proceed to Step 3 (Results Dashboard)
- [ ] **Verify eligibility with General discharge caveats:**
  - [ ] **Disability Compensation:** ELIGIBLE
    - Agent Orange presumptive conditions listed (diabetes, heart disease, prostate cancer, etc.)
    - Detail text explains presumptive benefit
  - [ ] **Healthcare:** ELIGIBLE
    - Agent Orange-related benefits explained
  - [ ] **Education:** NOT ELIGIBLE
    - Reason: "General Discharge does not qualify for Post-9/11 GI Bill"
    - Text includes information about discharge upgrade pathway (Section 1163)
  - [ ] **Home Loan:** ELIGIBLE
    - Text notes General discharge qualifies for VA Home Loan
  - [ ] **Vocational Rehabilitation:** ELIGIBLE
  - [ ] **Burial Benefits:** ELIGIBLE
- [ ] Proceed to Step 4 (Forms & Documents)
- [ ] **Verify forms:**
  - [ ] Intent to File form (critical)
  - [ ] Agent Orange claim form (VA Form 21-0960 with Agent Orange supplement)
  - [ ] Discharge upgrade information (Section 1163 form if available)
- [ ] **Overall verification:**
  - [ ] Agent Orange presumptive conditions are clear and prominent
  - [ ] Discharge upgrade information is helpful and accessible
  - [ ] No errors in console

---

### Scenario 6: Manual Entry Flow (No Profile Load)

**Objective:** Verify that manual form entry works correctly with input validation and conditional display.

**Steps:**

- [ ] Load the app
- [ ] Do **not** load a test profile (leave the "Load test profile" dropdown as default)
- [ ] **Step 1: DD-214 Form Entry**
  - [ ] Verify all form fields are empty and ready for input:
    - [ ] Rank field
    - [ ] Branch dropdown
    - [ ] Service Entry Date
    - [ ] Service End Date
    - [ ] Discharge Date
    - [ ] Character of Service dropdown
    - [ ] MOS field
    - [ ] Duty location field
  - [ ] Click "Next" without entering any data
  - [ ] **Verify required field validation:**
    - [ ] "Next" button is disabled (grayed out) or shows error
    - [ ] Error messages appear for required fields (e.g., "Discharge Type is required")
  - [ ] Fill in form with valid data:
    - [ ] Rank: MAJ
    - [ ] Branch: Air Force
    - [ ] Service Entry: 01/15/2000
    - [ ] Service End: 09/30/2020
    - [ ] Discharge Date: 09/30/2020
    - [ ] Character of Service: Honorable
    - [ ] MOS: 11B (Infantryman)
    - [ ] Duty: Stateside
  - [ ] **Verify MOS lookup:**
    - [ ] Type "11B" in MOS field
    - [ ] A dropdown or autocomplete appears showing "11B — Infantryman"
    - [ ] Select it; the description populates
  - [ ] Click "Next"; proceed to Step 2
- [ ] **Step 2: Questionnaire**
  - [ ] Verify questionnaire modules appear based on the data entered:
    - [ ] If service includes Iraq/Afghanistan → combat module shown
    - [ ] If discharge type is disability → disability modules shown
  - [ ] Fill in questionnaire responses (or skip to defaults)
  - [ ] Click "Next"
- [ ] **Step 3: Results Dashboard**
  - [ ] Verify results are calculated based on manually entered data (not a test profile)
  - [ ] Results should be consistent and logically derived
- [ ] **Overall verification:**
  - [ ] Form validation prevents submission with missing required fields
  - [ ] MOS lookup returns accurate descriptions
  - [ ] Questionnaire modules conditionally display
  - [ ] Results are calculated correctly from manual input
  - [ ] No errors in console

---

### Scenario 7: Accessibility Checks

**Objective:** Verify that the app meets WCAG 2.1 AA accessibility standards.

**Tools Needed:** Browser DevTools, screen reader (built-in to OS), color contrast checker

**Steps:**

- [ ] Load the app with a test profile (e.g., CPT Martinez)
- [ ] **Keyboard Navigation:**
  - [ ] Press Tab repeatedly; verify you can reach all interactive elements:
    - [ ] Dropdowns (Load test profile)
    - [ ] Form fields (all input fields)
    - [ ] Buttons (Next, Previous)
    - [ ] Links (in results and forms pages)
  - [ ] Verify no keyboard trap occurs (you can exit any element)
  - [ ] Verify focus moves in logical order (left-to-right, top-to-bottom)
- [ ] **Focus Indicators:**
  - [ ] As you tab through, verify a **visible blue outline** or focus indicator appears around each element
  - [ ] Focus indicator is at least 2px wide
  - [ ] Contrast is at least 3:1 against the background
- [ ] **Screen Reader (NVDA on Windows, VoiceOver on macOS):**
  - [ ] Open browser DevTools → Accessibility Inspector (or use native screen reader)
  - [ ] Verify the page has proper landmarks:
    - [ ] `<header>` containing navigation
    - [ ] `<main>` containing primary content
    - [ ] `<footer>` (if present)
  - [ ] Verify form fields have associated `<label>` elements:
    - [ ] Rank field has a label
    - [ ] Branch dropdown has a label
    - [ ] All input fields are labeled
  - [ ] Verify headings are properly structured (h1, h2, h3, not skipping levels)
  - [ ] Check that buttons have descriptive text (not just "Submit" without context)
- [ ] **ARIA Attributes:**
  - [ ] Progress bar (Step 1 of 4) has `aria-label` and/or `aria-valuenow`
  - [ ] Dropdowns have `aria-expanded` (true/false) and `aria-haspopup="listbox"`
  - [ ] Required form fields have `aria-required="true"`
  - [ ] Error messages have `role="alert"` or similar
- [ ] **Color Contrast:**
  - [ ] Use a color contrast checker tool (e.g., WebAIM, Deque)
  - [ ] Check headings and body text: minimum 4.5:1 contrast ratio
  - [ ] Check buttons and links: minimum 3:1 contrast ratio
  - [ ] Check disabled buttons: should still meet minimum contrast
- [ ] **Form Labels and Errors:**
  - [ ] All form fields have visible labels
  - [ ] Error messages are associated with their fields (via `aria-describedby` or similar)
  - [ ] Placeholder text alone does not replace labels
- [ ] **Images (if present):**
  - [ ] All images have `alt` text
  - [ ] Alt text is descriptive (not "image1.png")
- [ ] **Overall verification:**
  - [ ] App is fully keyboard navigable
  - [ ] Focus indicators are always visible
  - [ ] Screen reader announces all interactive elements
  - [ ] Color contrast meets standards
  - [ ] No accessibility errors in DevTools console

---

### Scenario 8: Edge Cases

**Objective:** Verify the app handles edge cases and boundary conditions gracefully.

**Steps:**

- [ ] **Dishonorable Discharge:**
  - [ ] Load the app
  - [ ] Manually enter a dishonorable discharge in Step 1
  - [ ] **Verify blocking:**
    - [ ] Warning banner appears: "Dishonorable Discharge bars all VA benefits"
    - [ ] Step 2 (Questionnaire) is skipped or blocked
    - [ ] Step 3 shows all benefits as **NOT ELIGIBLE**
    - [ ] Results explain that dishonorable discharge is a categorical bar
    - [ ] Button to proceed may be disabled or shows "No Eligible Benefits"

- [ ] **All Fields Empty:**
  - [ ] Load the app
  - [ ] Leave all fields in Step 1 empty
  - [ ] Click "Next" button
  - [ ] **Verify validation:**
    - [ ] Button is disabled (grayed out) OR form shows error messages
    - [ ] Error messages list all required fields
    - [ ] Form does not advance to Step 2

- [ ] **Pre-9/11 Service (No Post-9/11 GI Bill):**
  - [ ] Load the app
  - [ ] Manually enter service dates before 9/11/2001:
    - [ ] Service Entry: 01/01/1990
    - [ ] Service End: 08/31/2001
  - [ ] Fill in remaining fields and proceed
  - [ ] **Verify education eligibility:**
    - [ ] **Education:** NOT ELIGIBLE (or ELIGIBLE for Montgomery GI Bill only)
    - [ ] Detail text explains "Service must include time after September 10, 2001 for Post-9/11 GI Bill"
    - [ ] Alternative GI Bill options mentioned (Montgomery GI Bill, etc.)

- [ ] **Very Long Service (100+ months):**
  - [ ] Manually enter service dates spanning 9+ years:
    - [ ] Service Entry: 01/01/2000
    - [ ] Service End: 12/31/2009
  - [ ] Proceed through steps
  - [ ] **Verify education benefit:**
    - [ ] GI Bill is capped at 100% (no overage)
    - [ ] Benefit amount is calculated correctly (not excessive)

- [ ] **Ambiguous Discharge Date:**
  - [ ] Enter service dates where discharge date is before service end date:
    - [ ] Service End: 06/30/2010
    - [ ] Discharge Date: 06/15/2010
  - [ ] Click Next
  - [ ] **Verify validation:**
    - [ ] Form shows error: "Discharge date must be on or after service end date"
    - [ ] Form does not advance

- [ ] **Rapid Profile Switching:**
  - [ ] Load test profile CPT Martinez
  - [ ] Fill in some questionnaire data (e.g., select "Yes" for burn pits exposure)
  - [ ] Load a different profile (e.g., SPC Chen) from the dropdown
  - [ ] **Verify state management:**
    - [ ] Previous questionnaire responses are cleared
    - [ ] New profile data is fully loaded
    - [ ] Results reflect the new profile, not old data

---

## Bug Fixes Verified in This Release

The following bug fixes have been implemented and should be verified during testing:

### 1. Disability Discharge GI Bill (Fixed)
**Issue:** Veterans separated for disability with service < 3 months were incorrectly marked as ineligible for the Post-9/11 GI Bill.
**Fix:** `detectSecondaryConditions()` now correctly grants 100% GI Bill for disability separations regardless of service length.
**Verification:** Run Scenario 3 (SPC Chen). Verify that a 2-month disability separation veteran receives 100% GI Bill with detail text explaining the exception.

### 2. Bad Conduct Discharge Eligibility (Fixed)
**Issue:** Bad Conduct Discharge (BCD) veterans were blocked from all eligibility gates, even though BCD may qualify for certain benefits with character-of-service review.
**Fix:** BCD veterans now pass through eligibility gates for disability compensation, healthcare, and vocational rehabilitation (with appropriate caveats). Education and home loan remain blocked.
**Verification:** Run Scenario 2 (SGT Williams). Verify BCD caveat warnings appear and that the eligibility matrix matches the expected results (ELIGIBLE with caveat vs. NOT ELIGIBLE).

### 3. Duplicate Code Removal (Fixed)
**Issue:** `detectSecondaryConditions()` logic was duplicated across multiple files, creating inconsistency and maintenance burden.
**Fix:** Single-sourced from `rules-engine.ts`. All secondary condition detection now uses the same function.
**Verification:** Verify that secondary conditions appear consistently across all test profiles. Check that running Scenario 1 (CPT Martinez) shows secondary conditions (back → depression, PTSD → sleep apnea, etc.) in the Results Dashboard.

---

## Test Execution Checklist

Use this checklist to track your overall test progress:

- [ ] Scenario 1: Happy Path — CPT Martinez
- [ ] Scenario 2: Bad Conduct Discharge — SGT Williams
- [ ] Scenario 3: Disability Separation Short Service — SPC Chen
- [ ] Scenario 4: OTH + Camp Lejeune — SSG Johnson
- [ ] Scenario 5: General Discharge + Agent Orange — CPL Nguyen
- [ ] Scenario 6: Manual Entry Flow
- [ ] Scenario 7: Accessibility Checks
- [ ] Scenario 8: Edge Cases
- [ ] Bug Fix 1: Disability Discharge GI Bill
- [ ] Bug Fix 2: Bad Conduct Discharge Eligibility
- [ ] Bug Fix 3: Duplicate Code Removal

**All tests passed:** ☐

---

## Known Issues & Notes

- (Add any known issues, workarounds, or notes here as they arise during testing)

---

## Contact & Support

For issues or questions during testing, contact the development team.

**App Repository:** VetsPath by Aquia
**Test Environment:** http://localhost:3000 (local development)

---

*This guide is a living document. Update it as you discover edge cases or improvements.*
