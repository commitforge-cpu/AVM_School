/**
 * Every field collected on the Register form. Used by the register wizard,
 * the student dashboard and the admin edit screen so they never drift apart.
 * Names match the API (C# StudentProfile) in camelCase.
 */

export type FieldType = "text" | "email" | "tel" | "date" | "select" | "textarea" | "checkbox" | "number";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  pattern?: RegExp;
  patternMessage?: string;
  placeholder?: string;
  hint?: string;
  wide?: boolean;
  maxLength?: number;
  defaultValue?: string;
}

export interface FieldGroup {
  id: string;
  title: string;
  description: string;
  fields: FieldDef[];
}

const PHONE = /^[0-9+\-\s]{10,15}$/;
const PHONE_MSG = "Enter a valid phone number (10 to 15 digits).";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CLASS_OPTIONS = [
  "Pre-KG (Beanstalk)",
  "LKG (Beanstalk)",
  "UKG (Beanstalk)",
  ...Array.from({ length: 10 }, (_, i) => `Grade ${i + 1}`),
];

export function academicYearOptions(now = new Date()): string[] {
  const y = now.getFullYear();
  const start = now.getMonth() >= 5 ? y : y - 1; // academic year starts in June
  return [start, start + 1, start + 2].map((s) => `${s}-${String((s + 1) % 100).padStart(2, "0")}`);
}

export const STUDENT_GROUPS: FieldGroup[] = [
  {
    id: "student",
    title: "Student",
    description: "Details of the child applying, as they appear on the birth certificate.",
    fields: [
      { name: "firstName", label: "First name", type: "text", required: true, maxLength: 60 },
      { name: "middleName", label: "Middle name", type: "text", maxLength: 60 },
      { name: "lastName", label: "Last name", type: "text", required: true, maxLength: 60 },
      { name: "dateOfBirth", label: "Date of birth", type: "date", required: true },
      { name: "gender", label: "Gender", type: "select", required: true, options: ["Female", "Male", "Other"] },
      { name: "bloodGroup", label: "Blood group", type: "select", options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
      { name: "nationality", label: "Nationality", type: "text", maxLength: 40, defaultValue: "Indian" },
      { name: "religion", label: "Religion", type: "text", maxLength: 40 },
      { name: "category", label: "Category", type: "select", options: ["General", "OBC", "SC", "ST", "Other"] },
      { name: "motherTongue", label: "Mother tongue", type: "text", maxLength: 40, placeholder: "Kannada" },
      {
        name: "aadhaarNumber", label: "Aadhaar number", type: "text", maxLength: 12,
        pattern: /^\d{12}$/, patternMessage: "Aadhaar number must be exactly 12 digits.", hint: "12 digits, no spaces",
      },
    ],
  },
  {
    id: "admission",
    title: "Admission & health",
    description: "The class you're applying for, previous schooling and anything the school should know about your child's health.",
    fields: [
      { name: "classApplyingFor", label: "Class applying for", type: "select", required: true, options: CLASS_OPTIONS },
      { name: "academicYear", label: "Academic year", type: "select", required: true, options: academicYearOptions() },
      { name: "previousSchool", label: "Previous school", type: "text", maxLength: 150, wide: true },
      { name: "previousClass", label: "Class completed", type: "text", maxLength: 40 },
      { name: "previousBoard", label: "Board", type: "select", options: ["Karnataka State Board", "CBSE", "ICSE", "Other state board", "Other"] },
      { name: "previousPercentage", label: "Last result (% or grade)", type: "text", maxLength: 20 },
      { name: "medicalConditions", label: "Medical conditions", type: "textarea", maxLength: 500, wide: true, placeholder: "None" },
      { name: "allergies", label: "Allergies", type: "text", maxLength: 300, wide: true },
      { name: "identificationMarks", label: "Identification marks", type: "text", maxLength: 200, wide: true },
      { name: "siblingInSchool", label: "Brother or sister at AVM (name and class)", type: "text", maxLength: 200, wide: true },
      { name: "transportRequired", label: "We need school transport", type: "checkbox" },
    ],
  },
  {
    id: "address",
    title: "Address",
    description: "Where the student lives now.",
    fields: [
      { name: "addressLine1", label: "House / street", type: "text", required: true, maxLength: 200, wide: true },
      { name: "addressLine2", label: "Area / landmark", type: "text", maxLength: 200, wide: true },
      { name: "city", label: "City", type: "text", required: true, maxLength: 60, defaultValue: "Bengaluru" },
      { name: "state", label: "State", type: "text", required: true, maxLength: 60, defaultValue: "Karnataka" },
      { name: "pincode", label: "Pincode", type: "text", required: true, maxLength: 6, pattern: /^\d{6}$/, patternMessage: "Pincode must be 6 digits." },
    ],
  },
  {
    id: "parents",
    title: "Parents & guardian",
    description: "We contact parents first. Add a guardian if the child lives with someone else.",
    fields: [
      { name: "fatherName", label: "Father's name", type: "text", required: true, maxLength: 120 },
      { name: "fatherOccupation", label: "Father's occupation", type: "text", maxLength: 100 },
      { name: "fatherQualification", label: "Father's qualification", type: "text", maxLength: 100 },
      { name: "fatherPhone", label: "Father's phone", type: "tel", pattern: PHONE, patternMessage: PHONE_MSG },
      { name: "fatherEmail", label: "Father's email", type: "email", maxLength: 150, pattern: EMAIL, patternMessage: "Enter a valid email address." },
      { name: "motherName", label: "Mother's name", type: "text", required: true, maxLength: 120 },
      { name: "motherOccupation", label: "Mother's occupation", type: "text", maxLength: 100 },
      { name: "motherQualification", label: "Mother's qualification", type: "text", maxLength: 100 },
      { name: "motherPhone", label: "Mother's phone", type: "tel", pattern: PHONE, patternMessage: PHONE_MSG },
      { name: "motherEmail", label: "Mother's email", type: "email", maxLength: 150, pattern: EMAIL, patternMessage: "Enter a valid email address." },
      { name: "guardianName", label: "Guardian's name", type: "text", maxLength: 120 },
      { name: "guardianRelation", label: "Relation to child", type: "text", maxLength: 40 },
      { name: "guardianPhone", label: "Guardian's phone", type: "tel", pattern: PHONE, patternMessage: PHONE_MSG },
      { name: "annualFamilyIncome", label: "Annual family income", type: "select", options: ["Below ₹3 lakh", "₹3–6 lakh", "₹6–10 lakh", "₹10–20 lakh", "Above ₹20 lakh", "Prefer not to say"] },
      { name: "emergencyContactName", label: "Emergency contact name", type: "text", required: true, maxLength: 120 },
      { name: "emergencyContactPhone", label: "Emergency contact phone", type: "tel", required: true, pattern: PHONE, patternMessage: PHONE_MSG },
    ],
  },
];

export const ACCOUNT_FIELDS: FieldDef[] = [
  { name: "email", label: "Email (for login)", type: "email", required: true, maxLength: 150, pattern: EMAIL, patternMessage: "Enter a valid email address." },
  { name: "phone", label: "Mobile number", type: "tel", required: true, pattern: PHONE, patternMessage: "Enter a valid mobile number." },
];

export const ALL_STUDENT_FIELDS = STUDENT_GROUPS.flatMap((g) => g.fields);

export function validateField(f: FieldDef, raw: unknown): string | undefined {
  if (f.type === "checkbox") return undefined;
  const value = String(raw ?? "").trim();
  if (!value) return f.required ? `${f.label} is required.` : undefined;
  if (f.maxLength && value.length > f.maxLength) return `${f.label} must be ${f.maxLength} characters or fewer.`;
  if (f.pattern && !f.pattern.test(value)) return f.patternMessage ?? `${f.label} is not valid.`;
  if (f.name === "dateOfBirth") {
    const dob = new Date(value);
    const now = new Date();
    const age = (now.getTime() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (Number.isNaN(age) || age <= 0) return "Date of birth must be in the past.";
    if (age < 2) return "The child must be at least 2 years old.";
    if (age > 20) return "Check the date of birth.";
  }
  return undefined;
}

export function initialValues(): Record<string, string | boolean> {
  const v: Record<string, string | boolean> = {};
  for (const f of ALL_STUDENT_FIELDS) v[f.name] = f.type === "checkbox" ? false : f.defaultValue ?? "";
  for (const f of ACCOUNT_FIELDS) v[f.name] = "";
  return v;
}
