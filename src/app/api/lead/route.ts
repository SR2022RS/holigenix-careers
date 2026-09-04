import { NextResponse } from "next/server";
import { forwardLeadToGhl } from "@/lib/ghl";
import { buildPayload, validateLead, type LeadFormValues } from "@/lib/lead";
import { DEFAULT_SOURCE } from "@/lib/config";

/**
 * POST /api/lead — the browser posts the form here; we validate and forward
 * to GoHighLevel. Keeps the GHL webhook URL out of the client bundle and
 * removes any dependence on GHL's CORS behaviour.
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

  return NextResponse.json({ ok: true, delivered });
}
