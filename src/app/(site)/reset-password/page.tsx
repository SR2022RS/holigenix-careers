import { NewPasswordForm } from "@/components/account-forms";

export const metadata = { title: "Choose a new password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <section className="card account">
      <h2>Choose a new password</h2>
      <NewPasswordForm />
    </section>
  );
}
