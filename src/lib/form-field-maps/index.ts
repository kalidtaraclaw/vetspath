/**
 * VA Form Field Mappings
 * Comprehensive configuration for 5 core VA benefit forms
 * Maps form fields to veteran data sources (DD-214, questionnaire, personal info)
 */

import type { VAFormConfig } from './types';

/**
 * VA Form 21-0966: Intent to File for Disability Compensation
 * Simplest form - preserves effective date
 */
const FORM_21_0966: VAFormConfig = {
  formNumber: '21-0966',
  formName: 'Intent to File',
  description: 'Preserve your effective date before filing your full disability claim',
  pageCount: 2,
  totalFields: 16,
  autoFillableFields: 14,
  benefitCategory: 'disabilityComp',
  downloadUrl: 'https://www.va.gov/find-forms/about-form-21-0966/',
  onlineUrl: 'https://www.va.gov/supporting-forms-for-claims/intent-to-file-form-21-0966/',
  fieldMappings: [
    // Veteran Information Section
    {
      pdfFieldName: 'veteran_first_name',
      sourceField: 'dd214.name', // Will need to split on space
      label: 'First Name',
      required: true,
    },
    {
      pdfFieldName: 'veteran_middle_name',
      sourceField: 'dd214.name',
      label: 'Middle Name (if applicable)',
      required: false,
    },
    {
      pdfFieldName: 'veteran_last_name',
      sourceField: 'dd214.name',
      label: 'Last Name',
      required: true,
    },
    {
      pdfFieldName: 'veteran_ssn',
      sourceField: 'dd214.ssn',
      label: 'Social Security Number',
      required: true,
      format: 'ssn',
    },
    {
      pdfFieldName: 'veteran_dob',
      sourceField: 'dd214.dob',
      label: 'Date of Birth',
      required: true,
      format: 'date-mmddyyyy',
    },
    // Address Section
    {
      pdfFieldName: 'veteran_address_street',
      sourceField: 'dd214.address',
      label: 'Street Address',
      required: true,
    },
    {
      pdfFieldName: 'veteran_address_city',
      sourceField: 'dd214.city',
      label: 'City',
      required: true,
    },
    {
      pdfFieldName: 'veteran_address_state',
      sourceField: 'dd214.state',
      label: 'State',
      required: true,
      format: 'uppercase',
    },
    {
      pdfFieldName: 'veteran_address_zip',
      sourceField: 'dd214.zip',
      label: 'ZIP Code',
      required: true,
    },
    // Contact Section
    {
      pdfFieldName: 'veteran_phone',
      sourceField: 'dd214.phone',
      label: 'Daytime Phone Number',
      required: false,
      format: 'phone',
    },
    {
      pdfFieldName: 'veteran_email',
      sourceField: 'dd214.email',
      label: 'Email Address',
      required: false,
    },
    // Service Information
    {
      pdfFieldName: 'service_branch',
      sourceField: 'dd214.branch',
      label: 'Branch of Service',
      required: true,
      format: 'uppercase',
    },
    {
      pdfFieldName: 'service_number',
      sourceField: 'dd214.rank', // May need adjustment based on actual data
      label: 'Service Number/Rank',
      required: false,
    },
    // Benefit Type
    {
      pdfFieldName: 'benefit_type',
      sourceField: 'auto.compensation', // User selects this
      label: 'Type of Benefit (Compensation/Pension/Survivors)',
      required: true,
    },
    // Signature Block
    {
      pdfFieldName: 'veteran_signature',
      sourceField: 'auto.',
      label: 'Veteran Signature',
      required: true,
    },
    {
      pdfFieldName: 'signature_date',
      sourceField: 'auto.',
      label: 'Date Signed',
      required: true,
      format: 'date-mmddyyyy',
    },
  ],
};

/**
 * VA Form 21-526EZ: Application for Disability Compensation and Related Compensation Benefits
 * Most comprehensive form - primary disability compensation application
 */
const FORM_21_526EZ: VAFormConfig = {
  formNumber: '21-526EZ',
  formName: 'Disability Compensation Application',
  description: 'Primary application for service-connected disability benefits',
  pageCount: 6,
  totalFields: 34,
  autoFillableFields: 28,
  benefitCategory: 'disabilityComp',
  downloadUrl: 'https://www.va.gov/find-forms/about-form-21-526ez/',
  onlineUrl: 'https://www.va.gov/disability/file-disability-claim-form-21-526ez/',
  fieldMappings: [
    // Veteran Identification
    {
      pdfFieldName: 'veteran_name',
      sourceField: 'dd214.name',
      label: 'Full Name',
      required: true,
    },
    {
      pdfFieldName: 'veteran_ssn',
      sourceField: 'dd214.ssn',
      label: 'Social Security Number',
      required: true,
      format: 'ssn',
    },
    {
      pdfFieldName: 'veteran_dob',
      sourceField: 'dd214.dob',
      label: 'Date of Birth',
      required: true,
      format: 'date-mmddyyyy',
    },
    {
      pdfFieldName: 'veteran_gender',
      sourceField: 'dd214.gender',
      label: 'Gender',
      required: false,
    },
    // Contact Information
    {
      pdfFieldName: 'veteran_address',
      sourceField: 'dd214.address',
      label: 'Street Address',
      required: true,
    },
    {
      pdfFieldName: 'veteran_city',
      sourceField: 'dd214.city',
      label: 'City',
      required: true,
    },
    {
      pdfFieldName: 'veteran_state',
      sourceField: 'dd214.state',
      label: 'State',
      required: true,
      format: 'uppercase',
    },
    {
      pdfFieldName: 'veteran_zip',
      sourceField: 'dd214.zip',
      label: 'ZIP Code',
      required: true,
    },
    {
      pdfFieldName: 'veteran_phone',
      sourceField: 'dd214.phone',
      label: 'Daytime Phone',
      required: false,
      format: 'phone',
    },
    {
      pdfFieldName: 'veteran_email',
      sourceField: 'dd214.email',
      label: 'Email Address',
      required: false,
    },
    // Military Service Information
    {
      pdfFieldName: 'branch_of_service',
      sourceField: 'dd214.branch',
      label: 'Branch of Service',
      required: true,
      format: 'uppercase',
    },
    {
      pdfFieldName: 'service_entry_date',
      sourceField: 'dd214.enteredActiveDuty',
      label: 'Entry on Active Duty',
      required: true,
      format: 'date-mmddyyyy',
    },
    {
      pdfFieldName: 'service_separation_date',
      sourceField: 'dd214.separationDate',
      label: 'Separation Date',
      required: true,
      format: 'date-mmddyyyy',
    },
    {
      pdfFieldName: 'character_of_discharge',
      sourceField: 'dd214.characterOfDischarge',
      label: 'Character of Discharge',
      required: true,
    },
    // Service Details
    {
      pdfFieldName: 'rank',
      sourceField: 'dd214.rank',
      label: 'Rank at Separation',
      required: false,
      format: 'uppercase',
    },
    {
      pdfFieldName: 'mos',
      sourceField: 'dd214.mos',
      label: 'Military Occupational Specialty (MOS)',
      required: false,
    },
    // Claimed Conditions
    {
      pdfFieldName: 'claimed_conditions',
      sourceField: 'questionnaire.conditions',
      label: 'Claimed Conditions (separate multiple)',
      required: true,
    },
    // Current Status
    {
      pdfFieldName: 'currently_hospitalized',
      sourceField: 'questionnaire.',
      label: 'Currently Hospitalized',
      required: false,
      format: 'checkbox',
    },
    {
      pdfFieldName: 'previous_claims',
      sourceField: 'questionnaire.hasFiledIntentToFile',
      label: 'Previously Filed Claim(s)',
      required: false,
      format: 'checkbox',
    },
    // Disability Rating
    {
      pdfFieldName: 'current_disability_rating',
      sourceField: 'questionnaire.disabilityRating',
      label: 'Current Disability Rating (if any)',
      required: false,
    },
    // Medical Records
    {
      pdfFieldName: 'has_private_medical',
      sourceField: 'questionnaire.hasPrivateMedical',
      label: 'Has Private Medical Records',
      required: false,
      format: 'checkbox',
    },
    {
      pdfFieldName: 'has_va_records',
      sourceField: 'questionnaire.hasVARecords',
      label: 'Has VA Medical Records',
      required: false,
      format: 'checkbox',
    },
    // Financial Information
    {
      pdfFieldName: 'direct_deposit_account',
      sourceField: 'auto.',
      label: 'Direct Deposit Account Number',
      required: false,
    },
    {
      pdfFieldName: 'routing_number',
      sourceField: 'auto.',
      label: 'Bank Routing Number',
      required: false,
    },
    // Supporting Evidence
    {
      pdfFieldName: 'has_buddy_statements',
      sourceField: 'questionnaire.hasBuddyStatements',
      label: 'Submitting Buddy/Lay Statements',
      required: false,
      format: 'checkbox',
    },
    {
      pdfFieldName: 'cannot_work',
      sourceField: 'questionnaire.cannotWork',
      label: 'Cannot Work (for TDIU claim)',
      required: false,
      format: 'checkbox',
    },
    // Special Circumstances
    {
      pdfFieldName: 'has_ptsd',
      sourceField: 'questionnaire.hasPTSD',
      label: 'Claiming PTSD',
      required: false,
      format: 'checkbox',
    },
    {
      pdfFieldName: 'has_tinnitus',
      sourceField: 'questionnaire.hasTinnitus',
      label: 'Claiming Tinnitus',
      required: false,
      format: 'checkbox',
    },
    {
      pdfFieldName: 'has_hearing_loss',
      sourceField: 'questionnaire.hasHearingLoss',
      label: 'Claiming Hearing Loss',
      required: false,
      format: 'checkbox',
    },
    {
      pdfFieldName: 'has_secondary_conditions',
      sourceField: 'questionnaire.hasSecondaryConditions',
      label: 'Claiming Secondary Conditions',
      required: false,
      format: 'checkbox',
    },
    // Signature
    {
      pdfFieldName: 'signature',
      sourceField: 'auto.',
      label: 'Veteran Signature',
      required: true,
    },
    {
      pdfFieldName: 'signature_date',
      sourceField: 'auto.',
      label: 'Date Signed',
      required: true,
      format: 'date-mmddyyyy',
    },
  ],
};

/**
 * VA Form 10-10EZ: Application for Health Benefits
 * Healthcare enrollment form
 */
const FORM_10_10EZ: VAFormConfig = {
  formNumber: '10-10EZ',
  formName: 'Healthcare Enrollment',
  description: 'Application to enroll in VA healthcare system',
  pageCount: 4,
  totalFields: 28,
  autoFillableFields: 24,
  benefitCategory: 'healthcare',
  downloadUrl: 'https://www.va.gov/find-forms/about-form-10-10ez/',
  onlineUrl: 'https://www.va.gov/health-care/apply-for-health-care-form-10-10ez/',
  fieldMappings: [
    // Veteran Information
    {
      pdfFieldName: 'veteran_name',
      sourceField: 'dd214.name',
      label: 'Full Name',
      required: true,
    },
    {
      pdfFieldName: 'veteran_ssn',
      sourceField: 'dd214.ssn',
      label: 'Social Security Number',
      required: true,
      format: 'ssn',
    },
    {
      pdfFieldName: 'veteran_dob',
      sourceField: 'dd214.dob',
      label: 'Date of Birth',
      required: true,
      format: 'date-mmddyyyy',
    },
    {
      pdfFieldName: 'veteran_gender',
      sourceField: 'dd214.gender',
      label: 'Gender',
      required: false,
    },
    // Contact Information
    {
      pdfFieldName: 'address',
      sourceField: 'dd214.address',
      label: 'Street Address',
      required: true,
    },
    {
      pdfFieldName: 'city',
      sourceField: 'dd214.city',
      label: 'City',
      required: true,
    },
    {
      pdfFieldName: 'state',
      sourceField: 'dd214.state',
      label: 'State',
      required: true,
      format: 'uppercase',
    },
    {
      pdfFieldName: 'zip',
      sourceField: 'dd214.zip',
      label: 'ZIP Code',
      required: true,
    },
    {
      pdfFieldName: 'phone',
      sourceField: 'dd214.phone',
      label: 'Daytime Phone',
      required: false,
      format: 'phone',
    },
    {
      pdfFieldName: 'email',
      sourceField: 'dd214.email',
      label: 'Email Address',
      required: false,
    },
    // Service Information
    {
      pdfFieldName: 'branch',
      sourceField: 'dd214.branch',
      label: 'Branch of Service',
      required: true,
      format: 'uppercase',
    },
    {
      pdfFieldName: 'entry_date',
      sourceField: 'dd214.enteredActiveDuty',
      label: 'Entry on Active Duty',
      required: true,
      format: 'date-mmddyyyy',
    },
    {
      pdfFieldName: 'separation_date',
      sourceField: 'dd214.separationDate',
      label: 'Separation Date',
      required: true,
      format: 'date-mmddyyyy',
    },
    {
      pdfFieldName: 'discharge_type',
      sourceField: 'dd214.characterOfDischarge',
      label: 'Character of Discharge',
      required: true,
    },
    // Combat Service
    {
      pdfFieldName: 'combat_service_dates',
      sourceField: 'dd214.dutyLocations',
      label: 'Combat Service Locations/Dates',
      required: false,
    },
    // Special Circumstances
    {
      pdfFieldName: 'purple_heart',
      sourceField: 'dd214.decorations',
      label: 'Purple Heart',
      required: false,
      format: 'checkbox',
    },
    {
      pdfFieldName: 'pow_status',
      sourceField: 'dd214.remarks',
      label: 'Former Prisoner of War',
      required: false,
      format: 'checkbox',
    },
    // Health Information
    {
      pdfFieldName: 'disability_rating',
      sourceField: 'questionnaire.disabilityRating',
      label: 'Service-Connected Disability Rating',
      required: false,
    },
    // Insurance
    {
      pdfFieldName: 'insurance_info',
      sourceField: 'auto.',
      label: 'Current Insurance Information',
      required: false,
    },
    {
      pdfFieldName: 'insurance_type',
      sourceField: 'auto.',
      label: 'Type of Insurance',
      required: false,
    },
    // Next of Kin
    {
      pdfFieldName: 'next_of_kin_name',
      sourceField: 'auto.',
      label: 'Next of Kin Name',
      required: false,
    },
    {
      pdfFieldName: 'next_of_kin_relationship',
      sourceField: 'auto.',
      label: 'Relationship to Veteran',
      required: false,
    },
    {
      pdfFieldName: 'next_of_kin_phone',
      sourceField: 'auto.',
      label: 'Next of Kin Phone',
      required: false,
      format: 'phone',
    },
    // Signature
    {
      pdfFieldName: 'signature',
      sourceField: 'auto.',
      label: 'Veteran Signature',
      required: true,
    },
    {
      pdfFieldName: 'signature_date',
      sourceField: 'auto.',
      label: 'Date Signed',
      required: true,
      format: 'date-mmddyyyy',
    },
    // Consent
    {
      pdfFieldName: 'privacy_consent',
      sourceField: 'auto.',
      label: 'Privacy Act Acknowledgment',
      required: true,
      format: 'checkbox',
    },
  ],
};

/**
 * VA Form 22-1990: Application for Education Benefits (GI Bill)
 * Post-9/11 GI Bill application
 */
const FORM_22_1990: VAFormConfig = {
  formNumber: '22-1990',
  formName: 'Education Benefits Application',
  description: 'Application for Post-9/11 GI Bill education benefits',
  pageCount: 3,
  totalFields: 24,
  autoFillableFields: 20,
  benefitCategory: 'education',
  downloadUrl: 'https://www.va.gov/find-forms/about-form-22-1990/',
  onlineUrl: 'https://www.va.gov/education/apply-for-gi-bill-form-22-1990/',
  fieldMappings: [
    // Veteran Information
    {
      pdfFieldName: 'veteran_name',
      sourceField: 'dd214.name',
      label: 'Full Name',
      required: true,
    },
    {
      pdfFieldName: 'veteran_ssn',
      sourceField: 'dd214.ssn',
      label: 'Social Security Number',
      required: true,
      format: 'ssn',
    },
    {
      pdfFieldName: 'veteran_dob',
      sourceField: 'dd214.dob',
      label: 'Date of Birth',
      required: true,
      format: 'date-mmddyyyy',
    },
    {
      pdfFieldName: 'veteran_gender',
      sourceField: 'dd214.gender',
      label: 'Gender',
      required: false,
    },
    // Contact Information
    {
      pdfFieldName: 'address',
      sourceField: 'dd214.address',
      label: 'Street Address',
      required: true,
    },
    {
      pdfFieldName: 'city',
      sourceField: 'dd214.city',
      label: 'City',
      required: true,
    },
    {
      pdfFieldName: 'state',
      sourceField: 'dd214.state',
      label: 'State',
      required: true,
      format: 'uppercase',
    },
    {
      pdfFieldName: 'zip',
      sourceField: 'dd214.zip',
      label: 'ZIP Code',
      required: true,
    },
    {
      pdfFieldName: 'phone',
      sourceField: 'dd214.phone',
      label: 'Daytime Phone',
      required: false,
      format: 'phone',
    },
    {
      pdfFieldName: 'email',
      sourceField: 'dd214.email',
      label: 'Email Address',
      required: false,
    },
    // Service Information
    {
      pdfFieldName: 'branch',
      sourceField: 'dd214.branch',
      label: 'Branch of Service',
      required: true,
      format: 'uppercase',
    },
    {
      pdfFieldName: 'entry_date',
      sourceField: 'dd214.enteredActiveDuty',
      label: 'Entry on Active Duty',
      required: true,
      format: 'date-mmddyyyy',
    },
    {
      pdfFieldName: 'separation_date',
      sourceField: 'dd214.separationDate',
      label: 'Separation Date',
      required: true,
      format: 'date-mmddyyyy',
    },
    {
      pdfFieldName: 'character_of_discharge',
      sourceField: 'dd214.characterOfDischarge',
      label: 'Character of Discharge',
      required: true,
    },
    // Education Information
    {
      pdfFieldName: 'education_benefit_type',
      sourceField: 'auto.post-911-gi-bill',
      label: 'Benefit Type (Post-9/11 GI Bill)',
      required: true,
    },
    {
      pdfFieldName: 'school_name',
      sourceField: 'auto.',
      label: 'School/University Name',
      required: true,
    },
    {
      pdfFieldName: 'school_code',
      sourceField: 'auto.',
      label: 'School Code (DAPIP)',
      required: false,
    },
    {
      pdfFieldName: 'degree_or_certificate',
      sourceField: 'auto.',
      label: 'Degree or Certificate Sought',
      required: true,
    },
    {
      pdfFieldName: 'training_program_type',
      sourceField: 'auto.',
      label: 'Training Program Type',
      required: false,
    },
    {
      pdfFieldName: 'start_date',
      sourceField: 'auto.',
      label: 'Planned Start Date',
      required: true,
      format: 'date-mmddyyyy',
    },
    // Signature
    {
      pdfFieldName: 'signature',
      sourceField: 'auto.',
      label: 'Veteran Signature',
      required: true,
    },
    {
      pdfFieldName: 'signature_date',
      sourceField: 'auto.',
      label: 'Date Signed',
      required: true,
      format: 'date-mmddyyyy',
    },
  ],
};

/**
 * VA Form 26-1880: Request for Certificate of Eligibility (VA Loan)
 * Home loan eligibility certificate
 */
const FORM_26_1880: VAFormConfig = {
  formNumber: '26-1880',
  formName: 'Certificate of Eligibility (Home Loan)',
  description: 'Prove your VA home loan eligibility to your lender',
  pageCount: 2,
  totalFields: 18,
  autoFillableFields: 15,
  benefitCategory: 'homeLoan',
  downloadUrl: 'https://www.va.gov/find-forms/about-form-26-1880/',
  onlineUrl: 'https://www.va.gov/housing-assistance/home-loans/request-coe-form-26-1880/',
  fieldMappings: [
    // Veteran Information
    {
      pdfFieldName: 'veteran_name',
      sourceField: 'dd214.name',
      label: 'Full Name',
      required: true,
    },
    {
      pdfFieldName: 'veteran_ssn',
      sourceField: 'dd214.ssn',
      label: 'Social Security Number',
      required: true,
      format: 'ssn',
    },
    {
      pdfFieldName: 'veteran_dob',
      sourceField: 'dd214.dob',
      label: 'Date of Birth',
      required: true,
      format: 'date-mmddyyyy',
    },
    // Contact Information
    {
      pdfFieldName: 'address',
      sourceField: 'dd214.address',
      label: 'Street Address',
      required: true,
    },
    {
      pdfFieldName: 'city',
      sourceField: 'dd214.city',
      label: 'City',
      required: true,
    },
    {
      pdfFieldName: 'state',
      sourceField: 'dd214.state',
      label: 'State',
      required: true,
      format: 'uppercase',
    },
    {
      pdfFieldName: 'zip',
      sourceField: 'dd214.zip',
      label: 'ZIP Code',
      required: true,
    },
    {
      pdfFieldName: 'phone',
      sourceField: 'dd214.phone',
      label: 'Phone Number',
      required: false,
      format: 'phone',
    },
    // Service Information
    {
      pdfFieldName: 'branch',
      sourceField: 'dd214.branch',
      label: 'Branch of Service',
      required: true,
      format: 'uppercase',
    },
    {
      pdfFieldName: 'service_number',
      sourceField: 'dd214.rank',
      label: 'Service Number/Rank',
      required: false,
    },
    {
      pdfFieldName: 'entry_date',
      sourceField: 'dd214.enteredActiveDuty',
      label: 'Entry on Active Duty',
      required: true,
      format: 'date-mmddyyyy',
    },
    {
      pdfFieldName: 'separation_date',
      sourceField: 'dd214.separationDate',
      label: 'Separation Date',
      required: true,
      format: 'date-mmddyyyy',
    },
    {
      pdfFieldName: 'character_of_discharge',
      sourceField: 'dd214.characterOfDischarge',
      label: 'Character of Discharge',
      required: true,
    },
    // Loan History
    {
      pdfFieldName: 'previous_va_loan',
      sourceField: 'auto.',
      label: 'Previous VA Loan Used',
      required: false,
      format: 'checkbox',
    },
    // Disability
    {
      pdfFieldName: 'disability_rating',
      sourceField: 'questionnaire.disabilityRating',
      label: 'Service-Connected Disability Rating',
      required: false,
    },
    // Signature
    {
      pdfFieldName: 'signature',
      sourceField: 'auto.',
      label: 'Veteran Signature',
      required: true,
    },
    {
      pdfFieldName: 'signature_date',
      sourceField: 'auto.',
      label: 'Date Signed',
      required: true,
      format: 'date-mmddyyyy',
    },
  ],
};

/**
 * Export all form configurations
 */
export const VA_FORMS: Record<string, VAFormConfig> = {
  '21-0966': FORM_21_0966,
  '21-526EZ': FORM_21_526EZ,
  '10-10EZ': FORM_10_10EZ,
  '22-1990': FORM_22_1990,
  '26-1880': FORM_26_1880,
};

/**
 * Get form configuration by form number
 * @param formNumber - e.g., "21-0966"
 * @returns VAFormConfig or undefined if not found
 */
export function getFormConfig(formNumber: string): VAFormConfig | undefined {
  return VA_FORMS[formNumber];
}

/**
 * Get all available form configurations
 * @returns Array of all VAFormConfig objects
 */
export function getAllForms(): VAFormConfig[] {
  return Object.values(VA_FORMS);
}

/**
 * Get forms by benefit category
 * @param category - e.g., "disabilityComp", "healthcare", "education"
 * @returns Array of matching VAFormConfig objects
 */
export function getFormsByCategory(category: string): VAFormConfig[] {
  return Object.values(VA_FORMS).filter(form => form.benefitCategory === category);
}
