import { redirect } from "next/navigation";

import { openStep, signOut } from "@/app/account-actions";
import { careportal } from "@/lib/careportal";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Your application", robots: { index: false } };
export const dynamic = "force-dynamic";

type Step = { key: string; label: string; state: "done" | "your_turn" | "with_us" | "later"; detail: string; openPacket?: string };
type Doc = { type: string; label: string; status: "needed" | "under_review" | "verified" | "not_needed"; dueOn: string | null };
type Me = { ok: boolean; first_name: string; role: string; active: boolean; steps: Step[]; documents: Doc[] };

const STATE_LABEL: Record<Step["state"], string> = {
  done: "Done",
  your_turn: "Your turn",
  with_us: "With our team",
  later: "Later",
};
const DOC_LABEL: Record<Doc["status"], string> = {
  needed: "Needed",
  under_review: "Under review",
  verified: "Verified",
  not_needed: "Not needed",
};
const ROLE_LABEL: Record<string, string> = { rn: "Registered Nurse", lpn: "Licensed Practical Nurse", pca: "CNA / PCA" };

const day = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

/** The applicant's dashboard (PRD-07): where they are, and what is theirs to do. */
export default async function PortalPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/sign-in");

  const { status, data } = await careportal<Me>("me", { access_token: session.access_token });
  if (status !== 200 || !data?.ok) {
    await supabase.auth.signOut();
    redirect("/sign-in");
  }
  const me = data;
  const next = me.steps.find((s) => s.state === "your_turn");

  return (
    <div className="portal">
      <section className="portal__welcome">
        <div>
          <p className="portal__eyebrow">{ROLE_LABEL[me.role] ?? "Applicant"} · Holigenix Health Care</p>
          <h1>{me.first_name ? `Welcome, ${me.first_name}.` : "Welcome."}</h1>
          <p>
            {me.active
              ? "You're all set. Thank you for joining our team."
              : next
                ? `Your next step: ${next.label.toLowerCase()}.`
                : "Thank you. Our team is working on the next step and will be in touch."}
          </p>
        </div>
        <form action={signOut}>
          <button className="btn btn--secondary">Sign out</button>
        </form>
      </section>

      {error === "open" ? (
        <p className="field__error" role="alert">
          That step couldn&apos;t be opened just now. Please try again in a moment.
        </p>
      ) : null}

      <ol className="steps">
        {me.steps.map((s, i) => (
          <li key={s.key} className={`step step--${s.state}`}>
            <span className="step__num" aria-hidden="true">
              {s.state === "done" ? "✓" : i + 1}
            </span>
            <div className="step__body">
              <div className="step__head">
                <h2>{s.label}</h2>
                <span className="step__state">{STATE_LABEL[s.state]}</span>
              </div>
              <p>{s.detail}</p>
              {s.state === "your_turn" && s.openPacket ? (
                <form action={openStep}>
                  <input type="hidden" name="packet" value={s.openPacket} />
                  <button className="btn">Open</button>
                </form>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      {me.documents.length ? (
        <section className="card">
          <h2>Licenses and documents</h2>
          <ul className="docs">
            {me.documents.map((d) => (
              <li key={d.type} className={`doc doc--${d.status}`}>
                <span>{d.label}</span>
                <span className="doc__status">
                  {DOC_LABEL[d.status]}
                  {d.status === "needed" && d.dueOn ? ` · due ${day(d.dueOn)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="form-note">
        Questions? Call us at <a href="tel:+18888578667">(888) 857-8667</a>.
      </p>
    </div>
  );
}
