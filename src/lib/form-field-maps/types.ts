/**
 * Form Field Mapping Types
 * Defines the structure for mapping VA form fields to veteran data
 */

export interface FormFieldMapping {
  pdfFieldName: string; // Name of the field in the generated PDF
  sourceField: string; // dot-notation path into veteran data, e.g. "dd214.name", "questionnaire.dob"
  label: string; // Human-readable label for the field
  required: boolean; // Whether this field must be filled
  format?: "date-mmddyyyy" | "date-mmyyyy" | "uppercase" | "phone" | "ssn" | "checkbox"; // Optional formatting rule
  defaultValue?: string; // Optional default value
}

export interface VAFormConfig {
  formNumber: string; // e.g., "21-0966"
  formName: string; // e.g., "Intent to File"
  description: string; // Human-readable description
  pageCount: number; // Expected number of pages in official form
  totalFields: number; // Total count of fillable fields
  autoFillableFields: number; // Count of fields we can auto-fill
  fieldMappings: FormFieldMapping[]; // Array of field mappings
  benefitCategory: string; // matches keys from EligibilityResults
  downloadUrl: string; // VA.gov URL for official paper form
  onlineUrl?: string; // VA.gov URL for the online digital form (if available)
}
