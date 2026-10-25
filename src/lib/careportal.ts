import "server-only";

import { CAREPORTAL_URL } from "@/lib/env";

/**
 * The one way this site reaches hiring data: CarePortal's /api/careers/*,
 * with a shared secret that never leaves this server (PRD-07).
 */
export async function careportal<T>(path: "apply" | "account" | "me" | "open", body: unknown): Promise<{ status: number; data: T | null }> {
  const secret = process.env.CAREERS_API_SECRET;
  if (!secret) return { status: 503, data: null };
  try {
    const res = await fetch(`${CAREPORTAL_URL}/api/careers/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-careers-secret": secret },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return { status: res.status, data: (await res.json().catch(() => null)) as T | null };
  } catch {
    return { status: 502, data: null };
  }
}
