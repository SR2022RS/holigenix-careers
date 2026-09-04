import type { Metadata } from "next";
import { SuccessMessage } from "@/components/success-message";

export const metadata: Metadata = {
  title: "Thank you",
  robots: { index: false },
};

/** Standalone success page. The form also shows this message inline. */
export default function ThankYouPage() {
  return (
    <section className="card">
      <SuccessMessage />
    </section>
  );
}
