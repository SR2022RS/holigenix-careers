"use client";

import Link from "next/link";
import { useActionState } from "react";

import { acceptSetup, requestReset, setNewPassword, signIn, type FormState } from "@/app/account-actions";

function Feedback({ state }: { state: FormState }) {
  if (state?.error) return <p className="field__error" role="alert">{state.error}</p>;
  if (state?.message) return <p className="form-note" role="status">{state.message}</p>;
  return null;
}

function PasswordFields() {
  return (
    <>
      <div className="field">
        <label htmlFor="password">Choose a password <span className="optional">(at least 10 characters)</span></label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
      </div>
      <div className="field">
        <label htmlFor="confirm">Type it again</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </div>
    </>
  );
}

export function AccountSetupForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptSetup, undefined);
  return (
    <form action={action} noValidate>
      <input type="hidden" name="token" value={token} />
      <PasswordFields />
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Setting up…" : "Create my account"}</button>
    </form>
  );
}

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} noValidate key={state?.values?.email ?? "blank"}>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      <p className="form-note">
        <Link href="/forgot-password">Forgot your password?</Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestReset, undefined);
  return (
    <form action={action} noValidate>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(setNewPassword, undefined);
  return (
    <form action={action} noValidate>
      <PasswordFields />
      <Feedback state={state} />
      <button className="btn" disabled={pending}>{pending ? "Saving…" : "Save new password"}</button>
    </form>
  );
}
