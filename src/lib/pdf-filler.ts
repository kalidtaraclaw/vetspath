/**
 * VA Form PDF Filler
 * Generates professional PDF forms and pre-fills them with veteran data
 * Uses pdf-lib to create forms from scratch (no binary templates required)
 */

import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import type { VAFormConfig, FormFieldMapping } from './form-field-maps/types';
import { getFormConfig } from './form-field-maps';
import type { DD214Data, QuestionnaireData } from './rules-engine';

/**
 * Veteran profile combining all data sources
 */
export interface VeteranProfile {
  dd214: DD214Data;
  questionnaire: QuestionnaireData;
  personalInfo: {
    ssn?: string;
    dob?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
    email?: string;
    gender?: string;
  };
}

/**
 * Represents a filled field in the PDF
 */
export interface FilledField {
  label: string;
  value: string;
  source: 'dd214' | 'questionnaire' | 'personal' | 'auto' | 'empty';
  required: boolean;
}

/**
 * Result of filling a form
 */
export interface FormFillResult {
  pdfBytes: Uint8Array;
  formNumber: string;
  formName: string;
  filledFields: FilledField[];
  totalFields: number;
  filledCount: number;
  emptyCount: number;
  fillPercentage: number;
}

/**
 * Resolve a field value from the veteran profile using dot notation
 * @param sourceField - e.g., "dd214.name", "profile.ssn"
 * @param profile - The veteran profile
 * @returns Object with value and source
 */
function resolveFieldValue(
  sourceField: string,
  profile: VeteranProfile
): { value: string; source: FilledField['source'] } {
  const parts = sourceField.split('.');
  const section = parts[0];
  const field = parts.slice(1).join('.');

  let value = '';
  let source: FilledField['source'] = 'empty';

  if (section === 'dd214') {
    const val = (profile.dd214 as any)[field];
    if (val) {
      value = String(val);
      source = 'dd214';
    }
  } else if (section === 'questionnaire') {
    const val = (profile.questionnaire as any)[field];
    if (val !== undefined && val !== null) {
      if (Array.isArray(val)) {
        value = val.join(', ');
      } else {
        value = String(val);
      }
      source = 'questionnaire';
    }
  } else if (section === 'profile') {
    const val = (profile.personalInfo as any)[field];
    if (val) {
      value = String(val);
      source = 'personal';
    }
  } else if (section === 'auto') {
    // Auto fields are not pre-filled from data, they're for user signature/dates
    value = '';
    source = 'auto';
  }

  return { value, source };
}

/**
 * Format a value according to its specified format
 * @param value - The raw value
 * @param format - The format type
 * @returns Formatted value
 */
function formatValue(value: string, format?: FormFieldMapping['format']): string {
  if (!value || !format) return value;

  switch (format) {
    case 'uppercase':
      return value.toUpperCase();
    case 'date-mmddyyyy': {
      try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return value;
        return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
      } catch {
        return value;
      }
    }
    case 'date-mmyyyy': {
      try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return value;
        return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      } catch {
        return value;
      }
    }
    case 'phone': {
      const digits = value.replace(/\D/g, '');
      if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      }
      return value;
    }
    case 'ssn': {
      const digits = value.replace(/\D/g, '');
      if (digits.length === 9) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
      }
      return value;
    }
    case 'checkbox':
      return value ? 'Yes' : 'No';
    default:
      return value;
  }
}

/**
 * Generate a professional-looking PDF form and fill it with veteran data
 */
async function generateFormPDF(
  config: VAFormConfig,
  filledFields: FilledField[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Aquia brand colors
  const navy = rgb(3 / 255, 9 / 255, 64 / 255); // #030940
  const darkNavy = rgb(5 / 255, 15 / 255, 105 / 255); // #050F69
  const azure = rgb(32 / 255, 113 / 255, 198 / 255); // #2071C6
  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);
  const darkGray = rgb(0.2, 0.2, 0.2);
  const lightGray = rgb(0.92, 0.92, 0.92);
  const white = rgb(1, 1, 1);
  const fillBlue = rgb(0.85, 0.92, 1); // light blue for filled fields

  const pageWidth = 612; // letter
  const pageHeight = 792;
  const margin = 50;
  const fieldHeight = 18;
  const labelSize = 8;
  const valueSize = 10;
  const lineSpacing = 38;

  let currentPage = doc.addPage([pageWidth, pageHeight]);
  let yPos = pageHeight - margin;
  let pageNum = 1;

  const fieldsPerPage = Math.floor((pageHeight - 160) / lineSpacing);
  const totalPages = Math.ceil(filledFields.length / fieldsPerPage);

  /**
   * Draw page header
   */
  function drawHeader(page: PDFPage): number {
    // Top bar
    page.drawRectangle({
      x: 0,
      y: pageHeight - 40,
      width: pageWidth,
      height: 40,
      color: darkNavy,
    });

    page.drawText('DEPARTMENT OF VETERANS AFFAIRS', {
      x: margin,
      y: pageHeight - 28,
      size: 12,
      font: helveticaBold,
      color: white,
    });

    page.drawText(`VA Form ${config.formNumber}`, {
      x: pageWidth - margin - 120,
      y: pageHeight - 28,
      size: 12,
      font: helveticaBold,
      color: white,
    });

    // Form title
    page.drawText(config.formName.toUpperCase(), {
      x: margin,
      y: pageHeight - 60,
      size: 14,
      font: helveticaBold,
      color: navy,
    });

    // Subtitle
    page.drawText('PRE-FILLED BY VETSPATH — REVIEW ALL FIELDS BEFORE SUBMITTING', {
      x: margin,
      y: pageHeight - 76,
      size: 8,
      font: helvetica,
      color: azure,
    });

    // Divider
    page.drawLine({
      start: { x: margin, y: pageHeight - 82 },
      end: { x: pageWidth - margin, y: pageHeight - 82 },
      thickness: 2,
      color: navy,
    });

    return pageHeight - 100;
  }

  /**
   * Draw page footer
   */
  function drawFooter(page: PDFPage, pageNum: number, totalPages: number) {
    page.drawLine({
      start: { x: margin, y: 40 },
      end: { x: pageWidth - margin, y: 40 },
      thickness: 0.5,
      color: gray,
    });

    page.drawText(`VA Form ${config.formNumber} — Pre-filled by VetsPath`, {
      x: margin,
      y: 28,
      size: 7,
      font: helvetica,
      color: gray,
    });

    page.drawText(`Page ${pageNum} of ${totalPages}`, {
      x: pageWidth - margin - 60,
      y: 28,
      size: 7,
      font: helvetica,
      color: gray,
    });

    page.drawText('This is a pre-filled draft. Submit the official VA form available at va.gov/find-forms/', {
      x: margin,
      y: 18,
      size: 6,
      font: helvetica,
      color: gray,
    });
  }

  yPos = drawHeader(currentPage);

  // Track current section for grouping
  let currentSection = 'VETERAN INFORMATION';

  /**
   * Detect section from field label
   */
  function detectSection(label: string): string {
    const lbl = label.toLowerCase();
    if (lbl.includes('branch') || lbl.includes('service entry') || lbl.includes('separation') || lbl.includes('rank') || lbl.includes('mos') || lbl.includes('discharge')) {
      return 'SERVICE INFORMATION';
    } else if (lbl.includes('claimed') || lbl.includes('condition')) {
      return 'CLAIMED CONDITIONS';
    } else if (lbl.includes('address') || lbl.includes('city') || lbl.includes('state') || lbl.includes('zip')) {
      return 'CONTACT INFORMATION';
    } else if (lbl.includes('phone') || lbl.includes('email')) {
      return 'CONTACT INFORMATION';
    } else if (lbl.includes('hospitalized') || lbl.includes('previous') || lbl.includes('medical')) {
      return 'CURRENT STATUS & MEDICAL';
    } else if (lbl.includes('signature') || lbl.includes('date signed')) {
      return 'SIGNATURE';
    }
    return currentSection;
  }

  /**
   * Draw section header
   */
  function drawSectionHeader(page: PDFPage, section: string, y: number): number {
    if (section === currentSection) return y;

    currentSection = section;
    const headerY = y - 8;

    page.drawText(section, {
      x: margin,
      y: headerY,
      size: 10,
      font: helveticaBold,
      color: navy,
    });

    page.drawLine({
      start: { x: margin, y: headerY - 4 },
      end: { x: pageWidth - margin, y: headerY - 4 },
      thickness: 1,
      color: azure,
    });

    return headerY - 16;
  }

  // Process each field
  for (let i = 0; i < filledFields.length; i++) {
    const field = filledFields[i];

    // Check if we need a new page
    if (yPos < 70) {
      drawFooter(currentPage, pageNum, totalPages);
      currentPage = doc.addPage([pageWidth, pageHeight]);
      pageNum++;
      currentSection = 'VETERAN INFORMATION'; // Reset section on new page
      yPos = drawHeader(currentPage);
    }

    // Handle section headers
    const newSection = detectSection(field.label);
    if (newSection !== currentSection) {
      yPos = drawSectionHeader(currentPage, newSection, yPos);

      if (yPos < 70) {
        drawFooter(currentPage, pageNum, totalPages);
        currentPage = doc.addPage([pageWidth, pageHeight]);
        pageNum++;
        yPos = drawHeader(currentPage);
      }
    }

    const fieldWidth = pageWidth - 2 * margin;
    const bgColor = field.source !== 'empty' ? fillBlue : lightGray;

    // Field background
    currentPage.drawRectangle({
      x: margin,
      y: yPos - fieldHeight + 4,
      width: fieldWidth,
      height: fieldHeight,
      color: bgColor,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 0.5,
    });

    // Label
    const requiredMarker = field.required ? ' *' : '';
    currentPage.drawText(field.label + requiredMarker, {
      x: margin + 4,
      y: yPos + 5,
      size: labelSize,
      font: helvetica,
      color: gray,
    });

    // Value
    if (field.value) {
      currentPage.drawText(field.value, {
        x: margin + 4,
        y: yPos - fieldHeight + 10,
        size: valueSize,
        font: helveticaBold,
        color: black,
      });
    } else {
      currentPage.drawText('[TO BE COMPLETED]', {
        x: margin + 4,
        y: yPos - fieldHeight + 10,
        size: valueSize,
        font: helvetica,
        color: rgb(0.7, 0.3, 0.3),
      });
    }

    // Source badge
    if (field.source !== 'empty' && field.source !== 'auto') {
      const badgeText =
        field.source === 'dd214'
          ? 'DD-214'
          : field.source === 'questionnaire'
            ? 'Questionnaire'
            : field.source === 'personal'
              ? 'Profile'
              : 'Auto';

      const badgeWidth = helvetica.widthOfTextAtSize(badgeText, 6) + 8;
      currentPage.drawRectangle({
        x: pageWidth - margin - badgeWidth - 4,
        y: yPos + 2,
        width: badgeWidth,
        height: 12,
        color: azure,
        borderColor: azure,
        borderWidth: 0,
      });

      currentPage.drawText(badgeText, {
        x: pageWidth - margin - badgeWidth,
        y: yPos + 5,
        size: 6,
        font: helveticaBold,
        color: white,
      });
    }

    yPos -= lineSpacing;
  }

  // Draw final footer
  drawFooter(currentPage, pageNum, totalPages);

  return doc.save();
}

/**
 * Fill a VA form with veteran data and generate a PDF
 * @param formNumber - e.g., "21-0966"
 * @param profile - The veteran profile with all data
 * @returns FormFillResult with PDF bytes and statistics
 */
export async function fillForm(formNumber: string, profile: VeteranProfile): Promise<FormFillResult> {
  const config = getFormConfig(formNumber);
  if (!config) {
    throw new Error(`Unknown form: ${formNumber}`);
  }

  const filledFields: FilledField[] = [];

  // Process each field mapping
  for (const mapping of config.fieldMappings) {
    const { value, source } = resolveFieldValue(mapping.sourceField, profile);
    const formatted = formatValue(value, mapping.format);

    filledFields.push({
      label: mapping.label,
      value: formatted,
      source: value ? source : 'empty',
      required: mapping.required,
    });
  }

  // Calculate statistics
  const filledCount = filledFields.filter((f) => f.source !== 'empty').length;
  const emptyCount = filledFields.filter((f) => f.source === 'empty').length;
  const fillPercentage = Math.round((filledCount / filledFields.length) * 100);

  // Generate PDF
  const pdfBytes = await generateFormPDF(config, filledFields);

  return {
    pdfBytes,
    formNumber: config.formNumber,
    formName: config.formName,
    filledFields,
    totalFields: filledFields.length,
    filledCount,
    emptyCount,
    fillPercentage,
  };
}

/**
 * Fill multiple forms at once
 * @param formNumbers - Array of form numbers
 * @param profile - The veteran profile
 * @returns Array of FormFillResult
 */
export async function fillMultipleForms(
  formNumbers: string[],
  profile: VeteranProfile
): Promise<FormFillResult[]> {
  return Promise.all(formNumbers.map((formNumber) => fillForm(formNumber, profile)));
}

/**
 * Generate a summary of form fill results for display
 */
export function generateFillSummary(result: FormFillResult): string {
  return `
Form ${result.formNumber}: ${result.formName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Fields: ${result.totalFields}
Filled: ${result.filledCount} (${result.fillPercentage}%)
Empty: ${result.emptyCount}

Pre-filled fields are marked with their source:
• DD-214 fields from your discharge papers
• Questionnaire fields from your responses
• Profile fields from your personal information

Review all fields carefully before submitting the official form.
  `.trim();
}
