import { NextResponse } from "next/server";
import { forwardLeadToGhl } from "@/lib/ghl";
import { buildPayload, positionFor, validateLead, RESUME_MAX_BYTES, type LeadFormValues } from "@/lib/lead";
import { careportal } from "@/lib/careportal";
import { DEFAULT_SOURCE } from "@/lib/config";

/**
 * POST /api/lead — the browser posts the form here; we validate and forward
 * to GoHighLevel. Keeps the GHL webhook URL out of the client bundle and
 * removes any dependence on GHL's CORS behaviour.
 *
 * RN, LPN and CNA/PCA applications also go to CarePortal (PRD-07), which
 * opens an applicant account and emails a set-up link.
 *
 * Fail soft: a delivery problem is logged server-side and the response is
 * still 200 so the candidate never sees an error. Only a malformed request
 * (not a real form submit) gets a 400.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // Honeypot: real users never see or fill this field.
  if (typeof body.company === "string" && body.company.trim()) {
    return NextResponse.json({ ok: true, delivered: false });
  }

  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string) : "");
  const values: LeadFormValues = {
    full_name: str("full_name"),
    email: str("email"),
    phone: str("phone"),
    license_type: str("license_type"),
    city: str("city"),
    state: str("state") || "GA",
    zip: str("zip"),
  };

  const errors = validateLead(values);
  if (Object.keys(errors).length) {
    return NextResponse.json({ ok: false, errors }, { status: 400 });
  }

  const source = str("source").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || DEFAULT_SOURCE;
  const payload = buildPayload(values, source);
  const delivered = await forwardLeadToGhl(payload);
  if (!delivered) console.warn("[careers] lead not delivered (fail-soft)", { email: payload.email, source });

  // PRD-07: RN, LPN and CNA/PCA applicants also get an applicant account in
  // CarePortal and a "Set up your account" email. Fail-soft like GHL: the
  // applicant still sees success, and the lead is in GHL regardless.
  let account = false;
  const position = positionFor(payload.license_type);
  if (position) {
    const resume = str("resume");
    const resumeOk = resume.length > 0 && resume.length <= Math.ceil((RESUME_MAX_BYTES * 4) / 3) + 4;
    const { status } = await careportal("apply", {
      full_name: payload.full_name,
      email: payload.email,
      phone: payload.phone,
      position,
      city: payload.city,
      state: payload.state,
      zip: payload.zip || undefined,
      source: source === DEFAULT_SOURCE ? undefined : source,
      ...(resumeOk ? { resume: { base64: resume, mime: "application/pdf" } } : {}),
    });
    account = status === 200;
    if (!account) console.warn("[careers] applicant account not created (fail-soft)", { status });
  }

  return NextResponse.json({ ok: true, delivered, account });
}
