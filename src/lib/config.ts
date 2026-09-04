/**
 * Single source of truth for this site's identity.
 *
 * SITE_URL is read from NEXT_PUBLIC_SITE_URL and defaults to the production
 * domain. Everything that needs the canonical URL — <link rel="canonical">,
 * Open Graph tags, the QR generator, the /scan page — imports it from here.
 * Do not write the URL anywhere else.
 */
const DEFAULT_SITE_URL = "https://careers.holigenixhealthcare.com";

function normalize(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export const SITE_URL: string = normalize(
  process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL,
);

/** Hostname only, for display (e.g. under the QR code). */
export const SITE_HOST: string = SITE_URL.replace(/^https?:\/\//, "");

/**
 * Lead-source tracking. `?src=` on the landing URL is posted to GoHighLevel
 * as the `source` field so QR leads can be told apart from website leads.
 */
export const DEFAULT_SOURCE = "website";
export const QR_SOURCE = "qr-choa";

/**
 * What the printed QR code encodes. Must be the absolute production URL —
 * a QR has no page context to resolve a relative path against.
 */
export const QR_TARGET_URL = `${SITE_URL}/?src=${QR_SOURCE}`;

/** GoHighLevel Workflow "Inbound Webhook" trigger URL. Empty = log only. */
export const GHL_RECRUIT_WEBHOOK: string =
  process.env.NEXT_PUBLIC_GHL_RECRUIT_WEBHOOK ?? "";

export const LICENSE_TYPES = [
  "RN — Registered Nurse",
  "LPN — Licensed Practical Nurse",
  "CNA / PCA",
  "Nursing student",
  "Other",
] as const;

export const SITE_NAME = "Holigenix Healthcare Careers";
export const FOOTER_LINE =
  "Holigenix Healthcare LLC · Atlanta, GA · GA Medicaid / PeachCare for Kids provider";
