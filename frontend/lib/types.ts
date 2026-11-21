export type Role = "Admin" | "Student";

export interface UserView {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
}

/** Mirrors the Students table / C# Student model (camelCase JSON). */
export interface Student {
  id: number;
  userId: number;
  applicationNo: string;
  photoFileName?: string | null;
  admissionStatus: string;
  adminRemarks?: string | null;
  createdAt: string;
  updatedAt: string;
  [field: string]: unknown;
}

export interface StudentRow {
  student: Student;
  account: UserView | null;
}

export interface GalleryPhoto {
  id: number;
  title: string;
  description?: string | null;
  category: string;
  fileName: string;
  url: string;
  sortOrder: number;
  isPublished: boolean;
  fileSizeBytes: number;
  uploadedAt: string;
}

export interface ContactEnquiry {
  id: number;
  name: string;
  phone?: string | null;
  email: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface CareerApplication {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  position: string;
  cvLink?: string | null;
  status: string;
  createdAt: string;
}

export interface TokenResponse {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

export const ADMISSION_STATUSES = ["Pending", "Under Review", "Approved", "Waitlisted", "Rejected"] as const;
