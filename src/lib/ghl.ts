import "server-only";
import type { LeadPayload } from "@/lib/lead";

/**
 * Server-side forward to the GoHighLevel Workflow "Inbound Webhook".
 *
 * The URL is read from GHL_RECRUIT_WEBHOOK (server-only, never shipped to the
 * browser). NEXT_PUBLIC_GHL_RECRUIT_WEBHOOK is accepted as a fallback for
 * anyone who set it under the older name.
 *
 * Never throws. Returns whether GHL accepted the POST, for logging only.
 */
export function ghlWebhookUrl(): string {
  return (
    process.env.GHL_RECRUIT_WEBHOOK?.trim() ||
    process.env.NEXT_PUBLIC_GHL_RECRUIT_WEBHOOK?.trim() ||
    ""
  );
}

export async function forwardLeadToGhl(payload: LeadPayload): Promise<boolean> {
  const url = ghlWebhookUrl();
  if (!url) {
    console.warn("[careers] GHL_RECRUIT_WEBHOOK is not set — lead was NOT forwarded.", {
      email: payload.email,
      source: payload.source,
    });
    return false;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
