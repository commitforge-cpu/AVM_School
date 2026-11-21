"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Field from "./Field";
import { useAuth } from "./AuthProvider";
import type { ApiError } from "@/lib/api";
import { ACCOUNT_FIELDS, STUDENT_GROUPS, initialValues, validateField, type FieldDef } from "@/lib/studentFields";

type Values = Record<string, string | boolean>;

const REVIEW_STEP = STUDENT_GROUPS.length; // last step: account + review
const STEP_TITLES = [...STUDENT_GROUPS.map((g) => g.title), "Account & review"];

export default function RegisterWizard() {
  const router = useRouter();
  const { register } = useAuth();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(initialValues);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [declared, setDeclared] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [visited, setVisited] = useState<number[]>([0]);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  const set = (name: string, v: string | boolean) => {
    setValues((s) => ({ ...s, [name]: v }));
    setErrors((e) => { const { [name]: _, ...rest } = e; return rest; });
  };

  const stepFields = (i: number): FieldDef[] => (i < REVIEW_STEP ? STUDENT_GROUPS[i].fields : ACCOUNT_FIELDS);

  function validateStep(i: number): Record<string, string> {
    const errs: Record<string, string> = {};
    for (const f of stepFields(i)) {
      const m = validateField(f, values[f.name]);
      if (m) errs[f.name] = m;
    }
    if (i === REVIEW_STEP) {
      if (password.length < 8) errs.password = "Password must be at least 8 characters.";
      if (confirm !== password) errs.confirmPassword = "Passwords do not match.";
      if (!declared) errs.acceptDeclaration = "Please confirm the details are correct.";
    }
    return errs;
  }

  function go(i: number) {
    setStep(i);
    setVisited((v) => (v.includes(i) ? v : [...v, i]));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function next() {
    const errs = validateStep(step);
    setErrors(errs);
    if (Object.keys(errs).length === 0) go(step + 1);
  }

  function pickPhoto(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > 10 * 1024 * 1024) { setErrors((s) => ({ ...s, photo: "Photo must be smaller than 10 MB." })); return; }
    if (f && !/^image\/(jpeg|png|webp|gif)$/.test(f.type)) { setErrors((s) => ({ ...s, photo: "Use a JPG, PNG, WEBP or GIF image." })); return; }
    setErrors(({ photo: _, ...rest }) => rest);
    setPhoto(f);
    setPhotoUrl(f ? URL.createObjectURL(f) : null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    // validate every step; jump to the first one with a problem
    for (let i = 0; i <= REVIEW_STEP; i++) {
      const errs = validateStep(i);
      if (Object.keys(errs).length) { setErrors(errs); go(i); return; }
    }

    const fd = new FormData();
    for (const [k, v] of Object.entries(values)) {
      if (typeof v === "boolean") fd.append(k, String(v));
      else if (v.trim()) fd.append(k, v.trim());
    }
    fd.append("password", password);
    fd.append("confirmPassword", confirm);
    fd.append("acceptDeclaration", String(declared));
    if (photo) fd.append("photo", photo);

    setBusy(true);
    setFormError("");
    try {
      await register(fd);
      router.push("/dashboard?registered=1");
    } catch (err) {
      const a = err as ApiError;
      const mapped: Record<string, string> = {};
      let firstStep: number | null = null;
      for (const [key, msgs] of Object.entries(a.fieldErrors ?? {})) {
        const name = key.charAt(0).toLowerCase() + key.slice(1);
        mapped[name] = msgs[0];
        const idx = STUDENT_GROUPS.findIndex((g) => g.fields.some((f) => f.name.toLowerCase() === key.toLowerCase()));
        const s = idx >= 0 ? idx : REVIEW_STEP;
        firstStep = firstStep === null ? s : Math.min(firstStep, s);
      }
      setErrors(mapped);
      setFormError(a.message);
      if (firstStep !== null) go(firstStep);
    } finally {
      setBusy(false);
    }
  }

  const review = useMemo(
    () => STUDENT_GROUPS.map((g, i) => ({
      i, title: g.title,
      rows: g.fields
        .map((f) => [f.label, f.type === "checkbox" ? (values[f.name] ? "Yes" : "No") : String(values[f.name] ?? "")] as const)
        .filter(([, v]) => v),
    })),
    [values],
  );

  return (
    <div className="wizard" ref={topRef} style={{ scrollMarginTop: "calc(var(--nav-h) + 1rem)" }}>
      <ol className="wizard-steps" aria-label="Registration steps">
        {STEP_TITLES.map((t, i) => (
          <li key={t}>
            <button
              type="button"
              aria-current={step === i ? "step" : undefined}
              data-done={visited.includes(i) && i < step}
              disabled={!visited.includes(i)}
              onClick={() => go(i)}
              aria-label={`Step ${i + 1}: ${t}`}
            >
              {t}
            </button>
          </li>
        ))}
      </ol>

      <form className="form-card" onSubmit={submit} noValidate>
        {formError && <div className="alert alert-error" role="alert">{formError}</div>}

        {step < REVIEW_STEP ? (
          <>
            <h2 style={{ fontSize: "var(--t-xl)" }}>{STUDENT_GROUPS[step].title}</h2>
            <p className="muted" style={{ margin: ".3rem 0 1.5rem" }}>{STUDENT_GROUPS[step].description}</p>

            {step === 0 && (
              <div className="field" style={{ marginBottom: "1.4rem" }}>
                <span style={{ fontWeight: 600 }}>Student photo</span>
                <div className="photo-pick">
                  {photoUrl ? <img src={photoUrl} alt="Selected student photo" /> : <div className="ph">No photo</div>}
                  <div>
                    <label className="btn btn-quiet btn-sm" style={{ cursor: "pointer" }}>
                      {photo ? "Change photo" : "Choose photo"}
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={pickPhoto} className="sr-only" />
                    </label>
                    <p className="hint muted" style={{ marginTop: ".4rem", fontSize: ".85rem" }}>Passport-size, up to 10 MB. Optional.</p>
                    {errors.photo && <p className="error" style={{ color: "var(--bad)" }}>{errors.photo}</p>}
                  </div>
                </div>
              </div>
            )}

            <div className="form-grid">
              {STUDENT_GROUPS[step].fields.map((f) => (
                <Field key={f.name} def={f} idPrefix="reg" value={values[f.name]} error={errors[f.name]} onChange={set} />
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: "var(--t-xl)" }}>Account & review</h2>
            <p className="muted" style={{ margin: ".3rem 0 1.5rem" }}>
              Use these details to log in later and follow your application.
            </p>
            <div className="form-grid">
              {ACCOUNT_FIELDS.map((f) => (
                <Field key={f.name} def={f} idPrefix="reg" value={values[f.name]} error={errors[f.name]} onChange={set} />
              ))}
              <div className="field">
                <label htmlFor="reg-password">Password<span className="req" aria-hidden="true">*</span></label>
                <input id="reg-password" type="password" autoComplete="new-password" value={password}
                  aria-invalid={errors.password ? true : undefined} onChange={(e) => setPassword(e.target.value)} />
                {errors.password ? <span className="error">{errors.password}</span> : <span className="hint">At least 8 characters</span>}
              </div>
              <div className="field">
                <label htmlFor="reg-confirm">Confirm password<span className="req" aria-hidden="true">*</span></label>
                <input id="reg-confirm" type="password" autoComplete="new-password" value={confirm}
                  aria-invalid={errors.confirmPassword ? true : undefined} onChange={(e) => setConfirm(e.target.value)} />
                {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}
              </div>
            </div>

            <div className="review" style={{ marginTop: "2rem" }}>
              {review.map((g) => (
                <div key={g.title}>
                  <h3>
                    {g.title}
                    <button type="button" className="text-link" style={{ background: "none", border: 0, cursor: "pointer", fontSize: ".9rem" }} onClick={() => go(g.i)}>
                      Edit
                    </button>
                  </h3>
                  <dl>
                    {g.rows.map(([k, v]) => (<Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>))}
                  </dl>
                </div>
              ))}
              {photo && <p className="muted">Photo: {photo.name}</p>}
            </div>

            <div className="field" style={{ marginTop: "1.6rem" }}>
              <label className="check">
                <input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} aria-invalid={errors.acceptDeclaration ? true : undefined} />
                <span>I confirm that these details are correct, and I agree that the school may contact me about this application.</span>
              </label>
              {errors.acceptDeclaration && <span className="error">{errors.acceptDeclaration}</span>}
            </div>
          </>
        )}

        <div className="wizard-nav">
          {step > 0 ? <button key="back" type="button" className="btn btn-ghost" onClick={() => go(step - 1)}>Back</button> : <span key="spacer" />}
          {/* Different keys: React must not turn the clicked Continue button into the submit button. */}
          {step < REVIEW_STEP ? (
            <button key="continue" type="button" className="btn btn-primary" onClick={next}>Continue</button>
          ) : (
            <button key="submit" type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Submitting…" : "Submit registration"}</button>
          )}
        </div>
        <p className="muted" style={{ marginTop: "1.2rem", fontSize: ".92rem" }}>
          Already registered? <Link className="text-link" href="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
