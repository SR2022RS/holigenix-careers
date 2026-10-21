/**
 * Applicant accounts (PRD-07). The careers site signs people in with Supabase
 * Auth (public anon key) and reaches everything else through CarePortal's
 * /api/careers/* endpoints, using a secret only this server holds.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const CAREPORTAL_URL = (process.env.CAREPORTAL_API_URL || "https://clientportal.holigenixhealthcare.com").replace(/\/+$/, "");
export const accountsConfigured = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);
