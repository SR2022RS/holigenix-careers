"use client";

import { useEffect, useId, useRef, useState } from "react";
import { DEFAULT_SOURCE, LICENSE_TYPES } from "@/lib/config";
import {
  buildPayload,
  positionFor,
  readSource,
  RESUME_MAX_BYTES,
  submitLead,
  validateLead,
  type LeadErrors,
  type LeadFormValues,
} from "@/lib/lead";
import { SuccessMessage } from "@/components/success-message";

const EMPTY: LeadFormValues = {
  full_name: "",
  email: "",
  phone: "",
  license_type: "",
  city: "",
  state: "GA",
  zip: "",
};

type Status = "idle" | "submitting" | "done";

/**
 * The single recruitment form. Rendered by both "/" and "/apply".
 * Submit is handled in JS and POSTed via fetch — no full-page form POST.
 */
export function RecruitForm() {
  const id = useId();
  const [values, setValues] = useState<LeadFormValues>(EMPTY);
  const [errors, setErrors] = useState<LeadErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [honeypot, setHoneypot] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string | undefined>();
  const [account, setAccount] = useState(false);
  const cardRef = useRef<HTMLElement>(null);

  // ?src= is only knowable in the browser; the page itself stays static.
  useEffect(() => {
    setSource(readSource());
  }, []);

  function set<K extends keyof LeadFormValues>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value;
      setValues((v) => ({ ...v, [key]: value }));
      if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
    };
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status !== "idle") return;

    const nextErrors = validateLead(values);
    setErrors(nextErrors);
    const firstBad = (Object.keys(nextErrors) as (keyof LeadErrors)[]).find((k) => nextErrors[k]);
    if (firstBad) {
      e.currentTarget.querySelector<HTMLElement>(`[name="${firstBad}"]`)?.focus();
      return;
    }

    setStatus("submitting");
    const resumeBase64 = resume && positionFor(values.license_type) ? await toBase64(resume) : undefined;
    const result = await submitLead(buildPayload(values, source), honeypot, resumeBase64);
    if (!result.delivered) console.warn("[careers] lead not delivered; success shown anyway (fail-soft).");
    setAccount(result.account);
    setStatus("done");
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (status === "done") {
    return (
      <section className="card" ref={cardRef} aria-labelledby={`${id}-done`}>
        <h2 id={`${id}-done`} className="visually-hidden">
          Submission received
        </h2>
        <SuccessMessage account={account} />
      </section>
    );
  }

  const busy = status === "submitting";

  return (
    <section className="card" ref={cardRef} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>Leave your information below</h2>
      <p className="card__sub">
        When we have cases available in your area that match your interests and
        availability, a member of our team will reach out to help you get started.
      </p>

      <form onSubmit={onSubmit} noValidate aria-busy={busy}>
        {/* Honeypot: hidden from people, filled by bots. Server drops submits where it's set. */}
        <div className="visually-hidden" aria-hidden="true">
          <label htmlFor={`${id}-company`}>Company</label>
          <input
            id={`${id}-company`}
            name="company"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>
        <Field id={`${id}-full_name`} label="Full name" error={errors.full_name}>
          <input
            id={`${id}-full_name`}
            name="full_name"
            type="text"
            autoComplete="name"
            required
            value={values.full_name}
            onChange={set("full_name")}
            aria-invalid={!!errors.full_name}
            aria-describedby={errors.full_name ? `${id}-full_name-err` : undefined}
          />
        </Field>

        <Field id={`${id}-email`} label="Email" error={errors.email}>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            required
            value={values.email}
            onChange={set("email")}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? `${id}-email-err` : undefined}
          />
        </Field>

        <Field id={`${id}-phone`} label="Phone" error={errors.phone}>
          <input
            id={`${id}-phone`}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(404) 555-0123"
            required
            value={values.phone}
            onChange={set("phone")}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? `${id}-phone-err` : undefined}
          />
        </Field>

        <Field id={`${id}-license_type`} label="License type" error={errors.license_type}>
          <select
            id={`${id}-license_type`}
            name="license_type"
            required
            value={values.license_type}
            onChange={set("license_type")}
            aria-invalid={!!errors.license_type}
            aria-describedby={errors.license_type ? `${id}-license_type-err` : undefined}
          >
            <option value="" disabled>
              Select one…
            </option>
            {LICENSE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>

        <div className="row">
          <Field id={`${id}-city`} label="City" error={errors.city}>
            <input
              id={`${id}-city`}
              name="city"
              type="text"
              autoComplete="address-level2"
              required
              value={values.city}
              onChange={set("city")}
              aria-invalid={!!errors.city}
              aria-describedby={errors.city ? `${id}-city-err` : undefined}
            />
          </Field>

          <Field id={`${id}-state`} label="State" error={errors.state}>
            <input
              id={`${id}-state`}
              name="state"
              type="text"
              autoComplete="address-level1"
              autoCapitalize="characters"
              maxLength={2}
              required
              value={values.state}
              onChange={set("state")}
              aria-invalid={!!errors.state}
              aria-describedby={errors.state ? `${id}-state-err` : undefined}
            />
          </Field>

          <Field id={`${id}-zip`} label="ZIP" optional error={errors.zip}>
            <input
              id={`${id}-zip`}
              name="zip"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={10}
              value={values.zip}
              onChange={set("zip")}
            />
          </Field>
        </div>

        {positionFor(values.license_type) ? (
          <Field id={`${id}-resume`} label="Resume (PDF)" optional error={resumeError}>
            <input
              id={`${id}-resume`}
              name="resume"
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && (f.type !== "application/pdf" || f.size > RESUME_MAX_BYTES)) {
                  setResume(null);
                  setResumeError("Please choose a PDF under 3 MB.");
                  e.target.value = "";
                  return;
                }
                setResumeError(undefined);
                setResume(f);
              }}
            />
          </Field>
        ) : null}

        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Sending…" : "Submit & Stay Connected"}
        </button>
        <p className="form-note">We&apos;ll only use this to contact you about nursing opportunities.</p>
      </form>
    </section>
  );
}

function Field({
  id,
  label,
  optional,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} {optional && <span className="optional">(optional)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** A File as base64 without the data: prefix. */
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
