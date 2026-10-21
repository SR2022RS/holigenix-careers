import Link from "next/link";

import { SignInForm } from "@/components/account-forms";

export const metadata = { title: "Applicant sign-in", robots: { index: false } };

export default function SignInPage() {
  return (
    <section className="card account">
      <h2>Applicant sign-in</h2>
      <p className="card__sub">
        Sign in to complete your application, sign documents and upload your licenses and certifications.
      </p>
      <SignInForm />
      <p className="form-note">
        Haven&apos;t applied yet? <Link href="/apply">Start your application</Link>.
      </p>
    </section>
  );
}
