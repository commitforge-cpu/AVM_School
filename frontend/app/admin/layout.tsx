"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/content", label: "Page content" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/careers", label: "Career applications" },
  { href: "/admin/accounts", label: "Accounts" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || user.role !== "Admin")) router.replace("/login?as=admin");
  }, [loading, user, router]);

  if (loading || !user || user.role !== "Admin") {
    return <div className="auth-shell"><p className="muted">Checking your admin login…</p></div>;
  }

  const current = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <div className="admin">
      <aside className="admin-side" aria-label="Admin">
        <div className="who">
          <strong>{user.fullName}</strong>
          {user.email}
        </div>
        <ul>
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} aria-current={current(l.href) ? "page" : undefined}>{l.label}</Link>
            </li>
          ))}
          <li><Link href="/">View website</Link></li>
          <li>
            <a href="#" onClick={(e) => { e.preventDefault(); logout(); router.push("/login?as=admin"); }}>Log out</a>
          </li>
        </ul>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
