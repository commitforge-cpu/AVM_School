import type { Metadata } from "next";
import RegisterWizard from "@/components/RegisterWizard";

export const metadata: Metadata = { title: "Register" };

export default function RegisterPage() {
  return (
    <>
      <header className="page-head" style={{ paddingBottom: "2rem" }}>
        <div className="wrap">
          <h1>Register a student</h1>
          <p>Fill in your child&apos;s details to start an admission application. It takes about ten minutes; fields marked * are required.</p>
        </div>
      </header>
      <div className="panel">
        <section className="section" style={{ borderTop: 0, paddingTop: "2rem" }}>
          <div className="wrap"><RegisterWizard /></div>
        </section>
      </div>
    </>
  );
}
