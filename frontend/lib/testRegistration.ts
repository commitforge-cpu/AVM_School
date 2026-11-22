/**
 * Sample data for the "Fill test data" button on the Register page.
 * The button only appears in development (npm run dev), never on the live site.
 * Every value passes the form's checks; the login email is new on each click so the
 * same test can be submitted more than once.
 */
import { academicYearOptions } from "./studentFields";

export const TEST_PASSWORD = "Test@12345";

export function testRegistrationValues(now = new Date()): Record<string, string | boolean> {
  const dob = new Date(now.getFullYear() - 8, 4, 10); // 8 years old: right age for Grade 3
  const dateOfBirth = `${dob.getFullYear()}-05-10`;
  const stamp = String(now.getTime()).slice(-6);

  return {
    // Student
    firstName: "Test",
    middleName: "",
    lastName: "Student",
    dateOfBirth,
    gender: "Male",
    bloodGroup: "B+",
    nationality: "Indian",
    religion: "Hindu",
    category: "General",
    motherTongue: "Kannada",
    aadhaarNumber: "123456789012",

    // Admission & health
    classApplyingFor: "Grade 3",
    academicYear: academicYearOptions(now)[1],
    previousSchool: "Test Public School",
    previousClass: "Grade 2",
    previousBoard: "CBSE",
    previousPercentage: "85%",
    medicalConditions: "None",
    allergies: "None",
    identificationMarks: "Mole on left hand",
    siblingInSchool: "",
    transportRequired: true,

    // Address
    addressLine1: "12, 3rd Cross, Test Layout",
    addressLine2: "Near Test Park, Rajajinagar",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560010",

    // Parents & guardian
    fatherName: "Test Father",
    fatherOccupation: "Engineer",
    fatherQualification: "B.E.",
    fatherPhone: "9876543210",
    fatherEmail: "test.father@example.com",
    motherName: "Test Mother",
    motherOccupation: "Teacher",
    motherQualification: "M.A.",
    motherPhone: "9876543211",
    motherEmail: "test.mother@example.com",
    guardianName: "",
    guardianRelation: "",
    guardianPhone: "",
    annualFamilyIncome: "Prefer not to say",
    emergencyContactName: "Test Father",
    emergencyContactPhone: "9876543210",

    // Account
    email: `test.student.${stamp}@example.com`,
    phone: "9876543210",
  };
}
