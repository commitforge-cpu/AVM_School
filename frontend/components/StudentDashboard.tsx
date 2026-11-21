"use client";

/* eslint-disable @next/next/no-img-element */
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";
import { api, apiObjectUrl, type ApiError } from "@/lib/api";
import { STUDENT_GROUPS } from "@/lib/studentFields";

const NEXT_STEP: Record<string, string> = {
  Pending: "The school office will review your application and contact you about the aptitude test.",
  "Under Review": "Your application is being reviewed. The school will contact you about the test and interview.",
  Approved: "Admission approved. Please submit the conduct certificate from the previous school at the office.",
  Waitlisted: "Your child is on the waiting list. The school will contact you if a seat opens.",
  Rejected: "The school could not offer a seat this time. Contact the office if you have questions.",
};

function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (next.length < 8) { setMsg({ ok: false, text: "New password must be at least 8 characters." }); return; }
    try {
      await api("/api/auth/change-password", { body: { currentPassword: current, newPassword: next } });
      setMsg({ ok: true, text: "Password changed." });
      setCurrent(""); setNext("");
    } catch (err) { setMsg({ ok: false, text: (err as ApiError).message }); }
  }
  return (
    <form onSubmit={submit} className="box">
      <h2>Change password</h2>
      {msg && <div className={`alert ${msg.ok ? "alert-ok" : "alert-error"}`}>{msg.text}</div>}
      <div className="form-grid">
        <div className="field"><label htmlFor="cp-cur">Current password</label><input id="cp-cur" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} /></div>
        <div className="field"><label htmlFor="cp-new">New password</label><input id="cp-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} /></div>
      </div>
      <button className="btn btn-quiet" style={{ marginTop: "1rem" }}>Change password</button>
    </form>
  );
}

export default function StudentDashboard() {
  const { user, student, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role === "Admin") router.replace("/admin");
  }, [loading, user, router]);

  useEffect(() => {
    if (!student?.photoFileName) return;
    let url: string | null = null;
    apiObjectUrl(`/api/students/${student.id}/photo`).then((u) => { url = u; setPhoto(u); });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [student?.id, student?.photoFileName]);

  if (loading || !user) return <div className="auth-shell"><p className="muted">Loading…</p></div>;
  if (!student) return <div className="auth-shell"><p className="muted">No application is linked to this account. Contact the school office.</p></div>;

  const name = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");

  return (
    <div className="panel">
      <div className="wrap" style={{ padding: "3rem var(--gutter) 5rem" }}>
        {params.get("registered") && (
          <div className="alert alert-ok" role="status">
            Registration received. Your application number is <strong>{student.applicationNo}</strong>. Keep it for any calls with the school office.
          </div>
        )}

        <div className="split" style={{ alignItems: "center", marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", gap: "1.2rem", alignItems: "center" }}>
            {photo ? (
              <img src={photo} alt={name} style={{ width: 96, height: 120, objectFit: "cover", borderRadius: 10 }} />
            ) : (
              <div className="person"><div className="avatar" style={{ width: 96, aspectRatio: "4/5", fontSize: "2rem" }}>{String(student.firstName ?? "?")[0]}</div></div>
            )}
            <div>
              <h1 style={{ fontSize: "var(--t-2xl)" }}>{name}</h1>
              <p className="muted">Application {student.applicationNo}, {String(student.classApplyingFor)}, {String(student.academicYear)}</p>
            </div>
          </div>
          <div className="box">
            <p style={{ marginBottom: ".5rem" }}>Status <span className="badge" data-s={student.admissionStatus}>{student.admissionStatus}</span></p>
            <p className="muted">{NEXT_STEP[student.admissionStatus] ?? ""}</p>
            {student.adminRemarks && <p style={{ marginTop: ".8rem" }}><strong>Note from the school:</strong> {student.adminRemarks}</p>}
          </div>
        </div>

        <div className="split-even">
          <div>
            {STUDENT_GROUPS.map((g) => (
              <div className="box review" key={g.id}>
                <h2>{g.title}</h2>
                <dl>
                  {g.fields.map((f) => {
                    const v = student[f.name];
                    const shown = typeof v === "boolean" ? (v ? "Yes" : "No") : v ? String(v) : "";
                    return shown ? (<div key={f.name} style={{ display: "contents" }}><dt>{f.label}</dt><dd>{shown}</dd></div>) : null;
                  })}
                </dl>
              </div>
            ))}
          </div>
          <div>
            <div className="box">
              <h2>Need to change something?</h2>
              <p className="muted">Call or email the school office with your application number and they will update your details.</p>
            </div>
            <ChangePassword />
          </div>
        </div>
      </div>
    </div>
  );
}
