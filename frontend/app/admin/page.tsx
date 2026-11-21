"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type ApiError } from "@/lib/api";

interface Stats {
  students: number;
  byStatus: Record<string, number>;
  byClass: Record<string, number>;
  recentStudents: { id: number; applicationNo: string; firstName: string; lastName: string; classApplyingFor: string; admissionStatus: string; createdAt: string }[];
  photos: number;
  enquiries: number;
  unreadEnquiries: number;
  careerApplications: number;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { api<Stats>("/api/dashboard/stats").then(setStats).catch((e: ApiError) => setError(e.message)); }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!stats) return <p className="muted">Loading…</p>;

  const max = Math.max(1, ...Object.values(stats.byStatus), ...Object.values(stats.byClass));

  return (
    <>
      <div className="admin-head"><div><h1>Overview</h1><p className="muted">Applications, photos and messages at a glance.</p></div></div>

      <div className="stat-row">
        <Link className="stat" href="/admin/students"><b>{stats.students}</b><span>Registered students</span></Link>
        <Link className="stat" href="/admin/students?status=Pending"><b>{stats.byStatus["Pending"] ?? 0}</b><span>Waiting for review</span></Link>
        <Link className="stat" href="/admin/gallery"><b>{stats.photos}</b><span>Gallery photos</span></Link>
        <Link className="stat" href="/admin/enquiries"><b>{stats.unreadEnquiries}</b><span>Unread enquiries of {stats.enquiries}</span></Link>
        <Link className="stat" href="/admin/careers"><b>{stats.careerApplications}</b><span>Career applications</span></Link>
      </div>

      <div className="split-even">
        <div className="box">
          <h2>Applications by status</h2>
          <div className="bars">
            {Object.entries(stats.byStatus).map(([k, v]) => (
              <div key={k}><span>{k}</span><span className="bar"><i style={{ width: `${(v / max) * 100}%` }} /></span><b>{v}</b></div>
            ))}
          </div>
        </div>
        <div className="box">
          <h2>Applications by class</h2>
          {Object.keys(stats.byClass).length === 0 ? <p className="muted">No applications yet.</p> : (
            <div className="bars">
              {Object.entries(stats.byClass).map(([k, v]) => (
                <div key={k}><span>{k}</span><span className="bar"><i style={{ width: `${(v / max) * 100}%` }} /></span><b>{v}</b></div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="box" style={{ marginTop: "1.25rem" }}>
        <h2>Latest registrations</h2>
        {stats.recentStudents.length === 0 ? <p className="muted">When parents register, their applications appear here.</p> : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Application</th><th>Student</th><th>Class</th><th>Status</th><th>Registered</th></tr></thead>
              <tbody>
                {stats.recentStudents.map((s) => (
                  <tr key={s.id}>
                    <td><Link className="text-link" href={`/admin/students/${s.id}`}>{s.applicationNo}</Link></td>
                    <td>{s.firstName} {s.lastName}</td>
                    <td>{s.classApplyingFor}</td>
                    <td><span className="badge" data-s={s.admissionStatus}>{s.admissionStatus}</span></td>
                    <td>{new Date(s.createdAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
