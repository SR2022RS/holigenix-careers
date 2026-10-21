import { ForgotPasswordForm } from "@/components/account-forms";

export const metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <section className="card account">
      <h2>Reset your password</h2>
      <p className="card__sub">Enter the email you applied with and we&apos;ll send you a link.</p>
      <ForgotPasswordForm />
    </section>
  );
}
