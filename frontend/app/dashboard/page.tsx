import type { Metadata } from "next";
import { Suspense } from "react";
import StudentDashboard from "@/components/StudentDashboard";

export const metadata: Metadata = { title: "My application" };

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <StudentDashboard />
    </Suspense>
  );
}
