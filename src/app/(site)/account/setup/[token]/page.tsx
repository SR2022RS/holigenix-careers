import Link from "next/link";

import { AccountSetupForm } from "@/components/account-forms";
import { careportal } from "@/lib/careportal";

export const metadata = { title: "Set up your account", robots: { index: false } };

/** The link from the "Thank you for applying" email (PRD-07). */
export default async function AccountSetupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data } = await careportal<{ valid?: boolean; first_name?: string; message?: string }>("account", {
    action: "resolve",
    token,
  });
  return (
    <section className="card account">
      {data?.valid ? (
        <>
          <p className="badge">Step 1 of 2</p>
          <h2>Welcome{data.first_name ? `, ${data.first_name}` : ""}.</h2>
          <p className="card__sub">
            Choose a password for your applicant account. You&apos;ll use it with your email to complete your employment
            application and follow each step of the hiring process.
          </p>
          <AccountSetupForm token={token} />
        </>
      ) : (
        <>
          <h2>This link can&apos;t be used</h2>
          <p className="card__sub">
            {data?.message ?? "This link is not valid or has expired."} If you&apos;ve already set up your account,{" "}
            <Link href="/sign-in">sign in here</Link>.
          </p>
        </>
      )}
    </section>
  );
}
