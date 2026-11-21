"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { api, type ApiError } from "@/lib/api";
import { ADMISSION_STATUSES, type StudentRow } from "@/lib/types";
import { ALL_STUDENT_FIELDS, CLASS_OPTIONS } from "@/lib/studentFields";

function toCsv(rows: StudentRow[]): string {
  const cols = ["applicationNo", ...ALL_STUDENT_FIELDS.map((f) => f.name), "admissionStatus", "adminRemarks", "createdAt"];
  const head = [...cols, "accountEmail", "accountPhone"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) => [...cols.map((c) => esc(r.student[c])), esc(r.account?.email), esc(r.account?.phone)].join(","));
  return [head.join(","), ...lines].join("\r\n");
}

function StudentsList() {
  const params = useSearchParams();
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [cls, setCls] = useState("");

  useEffect(() => { api<StudentRow[]>("/api/students").then(setRows).catch((e: ApiError) => setError(e.message)); }, []);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter(({ student: s, account: a }) =>
      (!status || s.admissionStatus === status) &&
      (!cls || s.classApplyingFor === cls) &&
      (!q || [s.applicationNo, s.firstName, s.middleName, s.lastName, s.fatherName, s.motherName, a?.email, a?.phone]
        .some((v) => String(v ?? "").toLowerCase().includes(q))));
  }, [rows, search, status, cls]);

  function exportCsv() {
    const blob = new Blob(["﻿" + toCsv(shown)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `avm-students-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <div className="admin-head">
        <div><h1>Students</h1><p className="muted">Everyone who registered on the website. Open a student to view or edit every detail.</p></div>
        <button className="btn btn-quiet btn-sm" onClick={exportCsv} disabled={!shown.length}>Download CSV ({shown.length})</button>
      </div>

      <div className="toolbar">
        <input className="input" type="search" placeholder="Search name, application no, parent, email, phone" aria-label="Search students"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {ADMISSION_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="input" aria-label="Filter by class" value={cls} onChange={(e) => setCls(e.target.value)}>
          <option value="">All classes</option>
          {CLASS_OPTIONS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {!rows && !error && <p className="muted">Loading…</p>}
      {rows && shown.length === 0 && <div className="empty">{rows.length ? "No students match these filters." : "No registrations yet. Share the Register page with parents to start receiving applications."}</div>}

      {shown.length > 0 && (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Application</th><th>Student</th><th>Class</th><th>Parent</th><th>Contact</th><th>Status</th><th>Registered</th></tr>
            </thead>
            <tbody>
              {shown.map(({ student: s, account: a }) => (
                <tr key={s.id}>
                  <td><Link className="text-link" href={`/admin/students/${s.id}`}>{s.applicationNo}</Link></td>
                  <td>{String(s.firstName)} {String(s.lastName)}</td>
                  <td>{String(s.classApplyingFor)}</td>
                  <td>{String(s.fatherName)}<br /><span className="muted">{String(s.motherName)}</span></td>
                  <td>{a?.phone}<br /><span className="muted">{a?.email}</span></td>
                  <td><span className="badge" data-s={s.admissionStatus}>{s.admissionStatus}</span></td>
                  <td>{new Date(s.createdAt).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function StudentsPage() {
  return <Suspense fallback={<p className="muted">Loading…</p>}><StudentsList /></Suspense>;
}
