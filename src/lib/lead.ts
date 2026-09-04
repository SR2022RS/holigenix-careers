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
export async function submitLead(payload: LeadPayload, honeypot = ""): Promise<boolean> {
  try {
    const res = await fetch(LEAD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(honeypot ? { ...payload, company: honeypot } : payload),
      keepalive: true, // survive the user navigating away mid-request
    });
    if (!res.ok) {
      console.error(`[careers] /api/lead responded ${res.status}`, await safeText(res));
      return false;
    }
    const data = (await res.json().catch(() => ({}))) as { delivered?: boolean };
    return data.delivered === true;
  } catch (err) {
    console.error("[careers] /api/lead POST failed", err);
    return false;
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
