import { DEFAULT_SOURCE, LEAD_ENDPOINT, LICENSE_TYPES } from "@/lib/config";

export type LicenseType = (typeof LICENSE_TYPES)[number];

/** Exactly what is POSTed to GoHighLevel, as JSON. */
export interface LeadPayload {
  full_name: string;
  email: string;
  phone: string; // 10 digits, no formatting
  license_type: LicenseType;
  city: string;
  state: string;
  zip: string;
  source: string; // from ?src=, default "website"
  submitted_at: string; // ISO 8601
}

export interface LeadFormValues {
  full_name: string;
  email: string;
  phone: string;
  license_type: string;
  city: string;
  state: string;
  zip: string;
}

export type LeadErrors = Partial<Record<keyof LeadFormValues, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Strip formatting; drop a leading US country code so "+1 (404) …" still counts as 10 digits. */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits;
}

export function validateLead(v: LeadFormValues): LeadErrors {
  const errors: LeadErrors = {};
  if (!v.full_name.trim()) errors.full_name = "Please enter your full name.";
  if (!v.email.trim()) errors.email = "Please enter your email address.";
  else if (!EMAIL_RE.test(v.email.trim())) errors.email = "That email doesn't look right.";
  if (!v.phone.trim()) errors.phone = "Please enter your phone number.";
  else if (normalizePhone(v.phone).length !== 10)
    errors.phone = "Please enter a 10-digit phone number.";
  if (!(LICENSE_TYPES as readonly string[]).includes(v.license_type))
    errors.license_type = "Please choose your license type.";
  if (!v.city.trim()) errors.city = "Please enter your city.";
  if (!v.state.trim()) errors.state = "Please enter your state.";
  return errors;
}

/**
 * Which hiring role a license type applies for (PRD-07). RN, LPN and CNA/PCA
 * get an applicant account; a nursing student or "Other" stays a lead only,
 * because there is no role to hire them into yet.
 */
export function positionFor(licenseType: string): "rn" | "lpn" | "pca" | null {
  if (licenseType.startsWith("RN")) return "rn";
  if (licenseType.startsWith("LPN")) return "lpn";
  if (licenseType.startsWith("CNA")) return "pca";
  return null;
}

/** Resumes: PDF only, 3 MB — the request carries it as base64 and must stay
 *  under the hosting platform's 4.5 MB body limit. */
export const RESUME_MAX_BYTES = 3 * 1024 * 1024;

/** Read `?src=` from the current page URL. Safe to call only in the browser. */
export function readSource(): string {
  if (typeof window === "undefined") return DEFAULT_SOURCE;
  const src = new URLSearchParams(window.location.search).get("src")?.trim() ?? "";
  // Keep it to a short, tame token so nothing weird lands in the CRM.
  const clean = src.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return clean || DEFAULT_SOURCE;
}

export function buildPayload(v: LeadFormValues, source: string): LeadPayload {
  return {
    full_name: v.full_name.trim(),
    email: v.email.trim().toLowerCase(),
    phone: normalizePhone(v.phone),
    license_type: v.license_type as LicenseType,
    city: v.city.trim(),
    state: v.state.trim().toUpperCase(),
    zip: v.zip.trim(),
    source,
    submitted_at: new Date().toISOString(),
  };
}

/**
 * POST the lead to our own /api/lead route, which forwards it to GoHighLevel.
 *
 * FAIL SOFT: this never throws. The candidate always sees the success state;
 * a delivery problem is logged to the console and nowhere else. Returns
 * whether delivery appeared to succeed, for logging only.
 */
export async function submitLead(
  payload: LeadPayload,
  honeypot = "",
  resumeBase64?: string,
): Promise<{ delivered: boolean; account: boolean }> {
  try {
    const body = { ...payload, ...(honeypot ? { company: honeypot } : {}), ...(resumeBase64 ? { resume: resumeBase64 } : {}) };
    const res = await fetch(LEAD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // keepalive survives the user navigating away, but caps the body at
      // 64 KB — so it is only used when no resume is attached.
      keepalive: !resumeBase64,
    });
    if (!res.ok) {
      console.error(`[careers] /api/lead responded ${res.status}`, await safeText(res));
      return { delivered: false, account: false };
    }
    const data = (await res.json().catch(() => ({}))) as { delivered?: boolean; account?: boolean };
    return { delivered: data.delivered === true, account: data.account === true };
  } catch (err) {
    console.error("[careers] /api/lead POST failed", err);
    return { delivered: false, account: false };
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
