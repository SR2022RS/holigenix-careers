import "server-only";
import type { LeadPayload } from "@/lib/lead";

/**
 * Server-side delivery of a lead to GoHighLevel. Two independent paths, both
 * optional, both fail-soft. A lead is "delivered" if at least one succeeds.
 *
 *  1. Contacts API upsert (recommended) — needs GHL_API_TOKEN (a Private
 *     Integration token for the Holigenix Healthcare sub-account with
 *     contacts.write) and GHL_LOCATION_ID. Creates/updates the contact,
 *     tags it, and fills the existing custom fields. No workflow required;
 *     a workflow can trigger on the "careers-site-lead" tag.
 *  2. Workflow "Inbound Webhook" — GHL_RECRUIT_WEBHOOK (NEXT_PUBLIC_… honoured
 *     as a legacy name). Posts the raw JSON.
 *
 * Nothing here is ever shipped to the browser.
 */

const GHL_API = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";
/** GHL sits behind Cloudflare, which rejects bare/default runtime User-Agents (error 1010). */
const USER_AGENT = "holigenix-careers/1.0 (+https://careers.holigenixhealthcare.com)";

/** Tag every lead from this site carries. Trigger the GHL workflow on it. */
export const LEAD_TAG = "careers-site-lead";

/**
 * Existing contact custom fields in the Holigenix Healthcare sub-account
 * (rfZzMraSP58cwl2fJD5D), read from the location's custom-field list on
 * 2026-09-04. GHL's upsert applies `customFields[].id` reliably; the
 * `contact.<key>` form was silently ignored when tested.
 */
const CUSTOM_FIELD_IDS = {
  titleRnLpn: "Nncwg0ekTebjh4X5QKjC", // "Title (RN / LPN):"  key contact.title_rn_lpn
  positionAppliedFor: "KyGLGt62HXsGVB0CWMqD", // "Position Applied For"  key contact.position_applied_for
  referralSource: "LFZT5CUeAYnJXHj6r0MX", // "Referral Source:"  key contact.referral_source
} as const;

export function ghlWebhookUrl(): string {
  return (
    process.env.GHL_RECRUIT_WEBHOOK?.trim() ||
    process.env.NEXT_PUBLIC_GHL_RECRUIT_WEBHOOK?.trim() ||
    ""
  );
}

function ghlApiCreds(): { token: string; locationId: string } | null {
  const token = process.env.GHL_API_TOKEN?.trim();
  const locationId = process.env.GHL_LOCATION_ID?.trim();
  return token && locationId ? { token, locationId } : null;
}

export function ghlConfigured(): { api: boolean; webhook: boolean } {
  return { api: !!ghlApiCreds(), webhook: !!ghlWebhookUrl() };
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

/** "RN — Registered Nurse" → "rn", "CNA / PCA" → "cna-pca", "Nursing student" → "nursing-student" */
function licenseSlug(license: string): string {
  return license
    .split("—")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function upsertLeadContact(payload: LeadPayload): Promise<boolean> {
  const creds = ghlApiCreds();
  if (!creds) return false;

  const { firstName, lastName } = splitName(payload.full_name);
  const body = {
    locationId: creds.locationId,
    firstName,
    lastName,
    name: payload.full_name,
    email: payload.email,
    phone: `+1${payload.phone}`,
    city: payload.city,
    state: payload.state,
    postalCode: payload.zip || undefined,
    country: "US",
    source: payload.source,
    tags: [LEAD_TAG, `src-${payload.source}`, `license-${licenseSlug(payload.license_type)}`],
    customFields: [
      { id: CUSTOM_FIELD_IDS.titleRnLpn, field_value: payload.license_type },
      { id: CUSTOM_FIELD_IDS.positionAppliedFor, field_value: "Nurse (careers site)" },
      { id: CUSTOM_FIELD_IDS.referralSource, field_value: payload.source },
    ],
  };

  try {
    const res = await fetch(`${GHL_API}/contacts/upsert`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.token}`,
        Version: GHL_VERSION,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`[careers] GHL contacts/upsert responded ${res.status}`, await res.text().catch(() => ""));
      return false;
    }
    const data = (await res.json().catch(() => ({}))) as { contact?: { id?: string }; new?: boolean };
    console.log("[careers] GHL contact upserted", { id: data.contact?.id, new: data.new, source: payload.source });
    return true;
  } catch (err) {
    console.error("[careers] GHL contacts/upsert failed", err);
    return false;
  }
}

export async function postLeadToWebhook(payload: LeadPayload): Promise<boolean> {
  const url = ghlWebhookUrl();
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`[careers] GHL webhook responded ${res.status}`, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[careers] GHL webhook POST failed", err);
    return false;
  }
}

/** Run every configured path. Never throws. True if any path delivered. */
export async function forwardLeadToGhl(payload: LeadPayload): Promise<boolean> {
  const cfg = ghlConfigured();
  if (!cfg.api && !cfg.webhook) {
    console.warn("[careers] Neither GHL_API_TOKEN/GHL_LOCATION_ID nor GHL_RECRUIT_WEBHOOK is set — lead was NOT forwarded.", {
      email: payload.email,
      source: payload.source,
    });
    return false;
  }
  const [api, webhook] = await Promise.all([upsertLeadContact(payload), postLeadToWebhook(payload)]);
  return api || webhook;
}
