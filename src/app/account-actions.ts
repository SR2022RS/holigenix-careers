"use server";

import { redirect } from "next/navigation";

import { careportal } from "@/lib/careportal";
import { SITE_URL } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Applicant accounts (PRD-07). Every action signs in with Supabase Auth and
 * reaches hiring data only through CarePortal, which checks the session again.
 * React 19 resets a form after each submission, so typed values (never
 * passwords) are handed back on error.
 */
export type FormState = { error?: string; message?: string; values?: Record<string, string> } | undefined;

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};

export async function acceptSetup(_prev: FormState, fd: FormData): Promise<FormState> {
  const password = str(fd, "password");
  if (password !== str(fd, "confirm")) return { error: "The two passwords don't match." };
  const { data } = await careportal<{ ok?: boolean; email?: string; message?: string }>("account", {
    action: "accept",
    token: str(fd, "token"),
    password,
  });
  if (!data?.ok || !data.email) return { error: data?.message ?? "Something went wrong. Please try again." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: data.email, password });
  if (error) redirect("/sign-in");
  redirect("/portal");
}

export async function signIn(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").trim();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: str(fd, "password") });
  // One message for every failure: it must not reveal whether an email exists.
  if (error || !data.session) return { error: "That email and password don't match.", values: { email } };
  // Only applicant accounts belong here. A staff login is signed straight out.
  const me = await careportal("me", { access_token: data.session.access_token });
  if (me.status !== 200) {
    await supabase.auth.signOut();
    return { error: "This sign-in is for Holigenix job applicants. Staff, please use CarePortal or HoliNotes.", values: { email } };
  }
  redirect("/portal");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

export async function requestReset(_prev: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(str(fd, "email").trim(), {
    redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
  });
  return { message: "If that email has an applicant account, we've sent a link to reset the password." };
}

export async function setNewPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const password = str(fd, "password");
  if (password.length < 10) return { error: "Use at least 10 characters." };
  if (password.length > 72) return { error: "That password is too long." };
  if (password !== str(fd, "confirm")) return { error: "The two passwords don't match." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "That didn't work. Please request a new reset link." };
  redirect("/portal");
}

/** Open one of the applicant's steps in the secure signing pages. */
export async function openStep(fd: FormData) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/sign-in");
  const { data } = await careportal<{ ok?: boolean; url?: string }>("open", {
    access_token: session.access_token,
    packet: str(fd, "packet"),
  });
  if (!data?.ok || !data.url) redirect("/portal?error=open");
  redirect(data.url);
}
