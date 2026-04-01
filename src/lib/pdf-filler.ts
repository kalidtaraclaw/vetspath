/**
 * VA Form PDF Filler
 * Loads real VA form PDFs from the public/forms/ directory and fills them
 * with veteran data using pdf-lib, then flattens the forms.
 */

import { PDFDocument } from 'pdf-lib';
import type { DD214Data, QuestionnaireData } from './rules-engine';

/**
 * Result of filling a VA form
 */
export interface FillVAFormResult {
  pdfBytes: Uint8Array;
  filledCount: number;
  totalFields: number;
}

/**
 * Mapping of form numbers to PDF file paths (served from public/forms/)
 */
export const PDF_FILES: Record<string, string> = {
  '21-0966': '/forms/VA-Form-21-0966.pdf',
  '21-526EZ': '/forms/VA-Form-21-526EZ.pdf',
  '10-10EZ': '/forms/VA-Form-10-10EZ.pdf',
  '22-1990': '/forms/VA-Form-22-1990.pdf',
  '26-1880': '/forms/VA-Form-26-1880.pdf',
};

/**
 * Parse a date in various formats and return { month, day, year } as strings
 */
function parseDate(dateStr: string | undefined): { month: string; day: string; year: string } {
  if (!dateStr) return { month: '', day: '', year: '' };

  try {
    let date: Date;

    // Try ISO format (YYYY-MM-DD)
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      date = new Date(dateStr + 'T00:00:00Z');
    }
    // Try MM/DD/YYYY
    else if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
      const [m, d, y] = dateStr.split('/');
      date = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00Z`);
    }
    // Try text format (November 3, 1982)
    else {
      date = new Date(dateStr);
    }

    if (isNaN(date.getTime())) {
      return { month: '', day: '', year: '' };
    }

    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const year = String(date.getUTCFullYear());

    return { month, day, year };
  } catch {
    return { month: '', day: '', year: '' };
  }
}

/**
 * Parse a phone number and return { areaCode, middle, last }
 */
function parsePhone(phoneStr: string | undefined): { areaCode: string; middle: string; last: string } {
  if (!phoneStr) return { areaCode: '', middle: '', last: '' };

  const digits = phoneStr.replace(/\D/g, '');
  if (digits.length < 10) {
    return { areaCode: '', middle: '', last: '' };
  }

  return {
    areaCode: digits.slice(0, 3),
    middle: digits.slice(3, 6),
    last: digits.slice(6, 10),
  };
}

/**
 * Parse SSN and return { first, middle, last }
 */
function parseSSN(ssnStr: string | undefined): { first: string; middle: string; last: string } {
  if (!ssnStr) return { first: '', middle: '', last: '' };

  const digits = ssnStr.replace(/\D/g, '');
  if (digits.length !== 9) {
    return { first: '', middle: '', last: '' };
  }

  return {
    first: digits.slice(0, 3),
    middle: digits.slice(3, 5),
    last: digits.slice(5, 9),
  };
}

/**
 * Parse a name and return { first, middle, last, middleInitial }
 */
function parseName(fullName: string | undefined): {
  first: string;
  middle: string;
  last: string;
  middleInitial: string;
} {
  if (!fullName) return { first: '', middle: '', last: '', middleInitial: '' };

  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { first: '', middle: '', last: '', middleInitial: '' };

  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : '';
  const middleParts = parts.slice(1, parts.length - 1);
  const middle = middleParts.join(' ');
  const middleInitial = middle ? middle.split(' ')[0].charAt(0).toUpperCase() : '';

  return { first, middle, last, middleInitial };
}

/**
 * Format full address as "street, city, state ZIP"
 */
function formatFullAddress(
  address: string | undefined,
  city: string | undefined,
  state: string | undefined,
  zip: string | undefined
): string {
  const parts = [address, city, `${state} ${zip}`].filter((p) => p && p.trim());
  return parts.join(', ');
}

/**
 * Find a field by partial name match (VA PDFs use deep paths like F[0].Page_1[0].FieldName[0])
 * First tries exact match, then searches for a field whose name ends with the given name.
 */
function findField(form: ReturnType<PDFDocument['getForm']>, fieldName: string) {
  try {
    return form.getField(fieldName);
  } catch {
    // Try partial match — find first field whose name ends with the short name
    const fields = form.getFields();
    for (const f of fields) {
      if (f.getName().endsWith(fieldName) || f.getName().endsWith('.' + fieldName)) {
        return f;
      }
    }
    return null;
  }
}

/**
 * Set a text field in the PDF form
 * Returns true if field was set, false if field not found or read-only
 */
function setTextField(form: ReturnType<PDFDocument['getForm']>, fieldName: string, value: string): boolean {
  if (!value) return false;
  try {
    const field = findField(form, fieldName);
    if (field && 'setText' in field) {
      (field as { setText: (v: string) => void }).setText(value);
      return true;
    }
  } catch {
    // Field not found or read-only, continue silently
  }
  return false;
}

/**
 * Set a checkbox field in the PDF form
 * Returns true if field was set, false if field not found or read-only
 */
function setCheckboxField(form: ReturnType<PDFDocument['getForm']>, fieldName: string, checked: boolean): boolean {
  try {
    const field = findField(form, fieldName);
    if (field && 'check' in field) {
      const cb = field as unknown as { check: () => void; uncheck: () => void };
      if (checked) {
        cb.check();
      } else {
        cb.uncheck();
      }
      return true;
    }
  } catch {
    // Field not found or read-only, continue silently
  }
  return false;
}

/**
 * Fill VA Form 21-0966 (Intent to File)
 */
async function fillForm21_0966(
  pdf: PDFDocument,
  dd214: DD214Data,
  questionnaire: QuestionnaireData
): Promise<number> {
  const form = pdf.getForm();
  let filledCount = 0;

  const nameInfo = parseName(dd214.name);
  const ssnInfo = parseSSN(dd214.ssn);
  const phoneInfo = parsePhone(dd214.phone);
  const dobInfo = parseDate(dd214.dob);

  const fieldMap: Record<string, string> = {
    'Veterans_First_Name[0]': nameInfo.first,
    'Veterans_Last_Name[0]': nameInfo.last,
    'Veterans_Middle_Initial1[0]': nameInfo.middleInitial,
    'Veterans_Social_SecurityNumber_FirstThreeNumbers[0]': ssnInfo.first,
    'Veterans_Social_SecurityNumber_SecondTwoNumbers[0]': ssnInfo.middle,
    'VeteransSocialSecurityNumber_LastFourNumbers[0]': ssnInfo.last,
    'DOB_Month[0]': dobInfo.month,
    'DOB_Day[0]': dobInfo.day,
    'DOB_Year[0]': dobInfo.year,
    'Mailing_Address_NumberAndStreet[0]': dd214.address || '',
    'MailingAddress_City[0]': dd214.city || '',
    'MailingAddress_StateOrProvince[0]': dd214.state || '',
    'MailingAddress_ZIPOrPostalCode_FirstFiveNumbers[0]': dd214.zip || '',
    'Telephone_Number_FirstThreeNumbers[0]': phoneInfo.areaCode,
    'Telephone_Number_SecondThreeNumbers[0]': phoneInfo.middle,
    'Telephone_Number_LastFourNumbers[0]': phoneInfo.last,
    'EMAIL_ADDRESS[0]': dd214.email || '',
  };

  for (const [fieldName, value] of Object.entries(fieldMap)) {
    if (typeof value === 'string' && setTextField(form, fieldName, value)) {
      filledCount++;
    }
  }

  // Check compensation checkbox
  if (setCheckboxField(form, 'F[0].#subform[1].COMPENSATION[0]', true)) {
    filledCount++;
  }

  return filledCount;
}

/**
 * Fill VA Form 21-526EZ (Disability Compensation)
 */
async function fillForm21_526EZ(
  pdf: PDFDocument,
  dd214: DD214Data,
  questionnaire: QuestionnaireData
): Promise<number> {
  const form = pdf.getForm();
  let filledCount = 0;

  const nameInfo = parseName(dd214.name);
  const ssnInfo = parseSSN(dd214.ssn);
  const phoneInfo = parsePhone(dd214.phone);
  const dobInfo = parseDate(dd214.dob);
  const entryInfo = parseDate(dd214.enteredActiveDuty);
  const sepInfo = parseDate(dd214.separationDate);

  const fieldMap: Record<string, string> = {
    'Veteran_Service_Member_First_Name[0]': nameInfo.first,
    'Veteran_Service_Member_Last_Name[0]': nameInfo.last,
    'Veteran_Service_Member_Middle_Initial[0]': nameInfo.middleInitial,
    'SocialSecurityNumber_FirstThreeNumbers[0]': ssnInfo.first,
    'SocialSecurityNumber_SecondTwoNumbers[0]': ssnInfo.middle,
    'SocialSecurityNumber_LastFourNumbers[0]': ssnInfo.last,
    'Date_Of_Birth_Month[0]': dobInfo.month,
    'Date_Of_Birth_Day[0]': dobInfo.day,
    'Date_Of_Birth_Year[0]': dobInfo.year,
    'CurrentMailingAddress_NumberAndStreet[0]': dd214.address,
    'CurrentMailingAddress_City[0]': dd214.city,
    'CurrentMailingAddress_StateOrProvince[0]': dd214.state,
    'CurrentMailingAddress_Country[0]': 'US',
    'CurrentMailingAddress_ZIPOrPostalCode_FirstFiveNumbers[0]': dd214.zip,
    'Daytime_Phone_Number_Area_Code[0]': phoneInfo.areaCode,
    'Telephone_Middle_Three_Numbers[0]': phoneInfo.middle,
    'Telephone_Last_Four_Numbers[0]': phoneInfo.last,
    'Email_Address_Optional[0]': dd214.email,
    'Beginning_Date_Month[0]': entryInfo.month,
    'Beginning_Date_Day[0]': entryInfo.day,
    'Beginning_Date_Year[0]': entryInfo.year,
    'Ending_Date_Month[0]': sepInfo.month,
    'Ending_Date_Day[0]': sepInfo.day,
    'Ending_Date_Year[0]': sepInfo.year,
  };

  for (const [fieldName, value] of Object.entries(fieldMap)) {
    if (value && setTextField(form, fieldName, value)) {
      filledCount++;
    }
  }

  // Service information subform[11]
  const serviceFieldMap: Record<string, string> = {
    'EntryDate_Month[0]': entryInfo.month,
    'MostRecentActiveServiceEntryDate_Day[0]': entryInfo.day,
    'EntryDate_Year[0]': entryInfo.year,
    'ExitDate_Month[0]': sepInfo.month,
    'ExitDate_Day[0]': sepInfo.day,
    'ExitDate_Year[0]': sepInfo.year,
  };

  for (const [fieldName, value] of Object.entries(serviceFieldMap)) {
    if (value && setTextField(form, fieldName, value)) {
      filledCount++;
    }
  }

  // Claimed conditions subform[10]
  if (questionnaire.conditions && questionnaire.conditions.length > 0) {
    const condition = questionnaire.conditions[0];
    if (setTextField(form, 'CURRENTDISABILITY[0]', condition)) {
      filledCount++;
    }
  }

  return filledCount;
}

/**
 * Fill VA Form 10-10EZ (Healthcare)
 */
async function fillForm10_10EZ(
  pdf: PDFDocument,
  dd214: DD214Data,
  questionnaire: QuestionnaireData
): Promise<number> {
  const form = pdf.getForm();
  let filledCount = 0;

  const nameInfo = parseName(dd214.name);
  const ssnInfo = parseSSN(dd214.ssn);
  const phoneInfo = parsePhone(dd214.phone);
  const dobInfo = parseDate(dd214.dob);

  // Format name as "Last, First Middle"
  const firstMiddle = [nameInfo.first, nameInfo.middle].filter((p) => p).join(' ');
  const formattedName = nameInfo.last && firstMiddle ? `${nameInfo.last}, ${firstMiddle}` : dd214.name || '';

  // Format SSN as XXX-XX-XXXX
  const formattedSSN = ssnInfo.first && ssnInfo.middle && ssnInfo.last
    ? `${ssnInfo.first}-${ssnInfo.middle}-${ssnInfo.last}`
    : '';

  // Format date as MM/DD/YYYY
  const formattedDOB = dobInfo.month && dobInfo.day && dobInfo.year
    ? `${dobInfo.month}/${dobInfo.day}/${dobInfo.year}`
    : '';

  // Format phone as full number
  const formattedPhone = phoneInfo.areaCode && phoneInfo.middle && phoneInfo.last
    ? `${phoneInfo.areaCode}${phoneInfo.middle}${phoneInfo.last}`
    : '';

  const fieldMap: Record<string, string> = {
    'LastFirstMiddle[0]': formattedName,
    'SSN[0]': formattedSSN,
    'DOB[0]': formattedDOB,
    'MailingAddress_Street[0]': dd214.address,
    'MailingAddress_City[0]': dd214.city,
    'MailingAddress_State[0]': dd214.state,
    'MailingAddress_ZipCode[0]': dd214.zip,
    'HOMEPhone[0]': formattedPhone,
    'EmailAddress[0]': dd214.email,
    'LastBranchOfService[0]': dd214.branch,
    'LASTENTRYDATE[0]': dd214.enteredActiveDuty || '',
    'LASTDISCHARGEDATE[0]': dd214.separationDate || '',
    'DischargeType[0]': dd214.characterOfDischarge,
  };

  for (const [fieldName, value] of Object.entries(fieldMap)) {
    if (value && setTextField(form, fieldName, value)) {
      filledCount++;
    }
  }

  // Set birth sex radio button if available
  if (dd214.gender) {
    try {
      const genderField = findField(form, 'BirthSex[0]');
      if (genderField && 'select' in genderField) {
        (genderField as unknown as { select: (v: string) => void }).select(dd214.gender.charAt(0).toUpperCase());
        filledCount++;
      }
    } catch {
      // Field not found, continue
    }
  }

  return filledCount;
}

/**
 * Fill VA Form 22-1990 (Education/GI Bill)
 */
async function fillForm22_1990(
  pdf: PDFDocument,
  dd214: DD214Data,
  questionnaire: QuestionnaireData
): Promise<number> {
  const form = pdf.getForm();
  let filledCount = 0;

  const nameInfo = parseName(dd214.name);
  const ssnInfo = parseSSN(dd214.ssn);
  const phoneInfo = parsePhone(dd214.phone);
  const dobInfo = parseDate(dd214.dob);
  const entryInfo = parseDate(dd214.enteredActiveDuty);
  const sepInfo = parseDate(dd214.separationDate);

  const fieldMap: Record<string, string> = {
    'namefirst[0]': nameInfo.first,
    'namemiddle[0]': nameInfo.middle,
    'namelast[0]': nameInfo.last,
    'ssna1[0]': ssnInfo.first,
    'ssna2[0]': ssnInfo.middle,
    'ssna3[0]': ssnInfo.last,
    'dateofbirth1[0]': dobInfo.month,
    'dateofbirth2[0]': dobInfo.day,
    'dateofbirth3[0]': dobInfo.year,
    'noandstreet1[0]': dd214.address,
    'city1[0]': dd214.city,
    'state1[0]': dd214.state,
    'zip1[0]': dd214.zip,
    'primaryphone1[0]': `${phoneInfo.middle}${phoneInfo.last}`,
    'areacodep1[0]': phoneInfo.areaCode,
    'email1[0]': dd214.email,
  };

  for (const [fieldName, value] of Object.entries(fieldMap)) {
    if (value && setTextField(form, fieldName, value)) {
      filledCount++;
    }
  }

  // Service info on subform[4]
  const serviceFieldMap: Record<string, string> = {
    'Dateentered1[0]': entryInfo.month + entryInfo.day + entryInfo.year,
    'Dateseperated1[0]': sepInfo.month + sepInfo.day + sepInfo.year,
    'servicecomp1[0]': dd214.branch,
  };

  for (const [fieldName, value] of Object.entries(serviceFieldMap)) {
    if (value && setTextField(form, fieldName, value)) {
      filledCount++;
    }
  }

  return filledCount;
}

/**
 * Fill VA Form 26-1880 (Home Loan COE)
 */
async function fillForm26_1880(
  pdf: PDFDocument,
  dd214: DD214Data,
  questionnaire: QuestionnaireData
): Promise<number> {
  const form = pdf.getForm();
  let filledCount = 0;

  const ssnInfo = parseSSN(dd214.ssn);
  const phoneInfo = parsePhone(dd214.phone);
  const dobInfo = parseDate(dd214.dob);
  const entryInfo = parseDate(dd214.enteredActiveDuty);
  const sepInfo = parseDate(dd214.separationDate);

  // Format full address
  const fullAddress = formatFullAddress(dd214.address, dd214.city, dd214.state, dd214.zip);

  // Format date as MM/DD/YYYY
  const formattedDOB = dobInfo.month && dobInfo.day && dobInfo.year
    ? `${dobInfo.month}/${dobInfo.day}/${dobInfo.year}`
    : '';

  // Format phone
  const formattedPhone = phoneInfo.areaCode && phoneInfo.middle && phoneInfo.last
    ? `(${phoneInfo.areaCode}) ${phoneInfo.middle}-${phoneInfo.last}`
    : '';

  // Format entry and separation dates
  const formattedEntry = entryInfo.month && entryInfo.day && entryInfo.year
    ? `${entryInfo.month}/${entryInfo.day}/${entryInfo.year}`
    : '';

  const formattedSep = sepInfo.month && sepInfo.day && sepInfo.year
    ? `${sepInfo.month}/${sepInfo.day}/${sepInfo.year}`
    : '';

  const fieldMap: Record<string, string> = {
    'NameOfVeteran[0]': dd214.name,
    'Address_NumberandStreetorRuralRoute_City_or_PO_State_ZIPCode[0]': fullAddress,
    'SSN[0]': `${ssnInfo.first}-${ssnInfo.middle}-${ssnInfo.last}`,
    'DateOfBirth[0]': formattedDOB,
    'TelephoneNumber[0]': formattedPhone,
    'Email[0]': dd214.email,
    'BranchOfService11A1[0]': dd214.branch,
    'DateEntered11A1[0]': formattedEntry,
    'DateSeparated11A1[0]': formattedSep,
  };

  for (const [fieldName, value] of Object.entries(fieldMap)) {
    if (value && setTextField(form, fieldName, value)) {
      filledCount++;
    }
  }

  return filledCount;
}

/**
 * Load and fill a VA form PDF with veteran data
 * Fetches the PDF from the public/forms/ directory, fills it, and flattens the form
 *
 * @param formNumber - The VA form number (e.g., "21-0966", "21-526EZ")
 * @param dd214 - DD214 data from discharge papers
 * @param questionnaire - Questionnaire data from user responses
 * @returns FillVAFormResult with PDF bytes, filled field count, and total field count
 */
export async function fillVAForm(
  formNumber: string,
  dd214: DD214Data,
  questionnaire: QuestionnaireData
): Promise<FillVAFormResult> {
  // Get the PDF file path
  const pdfPath = PDF_FILES[formNumber];
  if (!pdfPath) {
    throw new Error(`Unknown form number: ${formNumber}`);
  }

  // Fetch the PDF from the public directory
  const response = await fetch(pdfPath);
  if (!response.ok) {
    throw new Error(`Failed to load PDF: ${formNumber} from ${pdfPath}`);
  }

  const pdfBytes = await response.arrayBuffer();

  // Load the PDF document
  // Using ignoreEncryption: true because some VA forms have XFA encryption
  // pdf-lib will remove XFA but the form fields still work
  const pdf = await PDFDocument.load(new Uint8Array(pdfBytes), { ignoreEncryption: true });

  let filledCount = 0;

  // Route to form-specific filler based on form number
  switch (formNumber) {
    case '21-0966':
      filledCount = await fillForm21_0966(pdf, dd214, questionnaire);
      break;
    case '21-526EZ':
      filledCount = await fillForm21_526EZ(pdf, dd214, questionnaire);
      break;
    case '10-10EZ':
      filledCount = await fillForm10_10EZ(pdf, dd214, questionnaire);
      break;
    case '22-1990':
      filledCount = await fillForm22_1990(pdf, dd214, questionnaire);
      break;
    case '26-1880':
      filledCount = await fillForm26_1880(pdf, dd214, questionnaire);
      break;
    default:
      throw new Error(`Form filler not implemented: ${formNumber}`);
  }

  // Count total fields in the form
  const form = pdf.getForm();
  const fields = form.getFields();
  const totalFields = fields.length;

  // Note: We do NOT flatten the form so users can still edit fields in their PDF viewer
  // To flatten (make fields permanent text), uncomment:
  // form.flatten();

  // Save the filled PDF
  const filledPdfBytes = await pdf.save();

  return {
    pdfBytes: filledPdfBytes,
    filledCount,
    totalFields,
  };
}
