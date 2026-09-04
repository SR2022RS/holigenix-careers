import type { Metadata } from "next";
import { Landing } from "@/components/landing";

export const metadata: Metadata = {
  title: "Apply",
  alternates: { canonical: "/apply" },
};

/**
 * Clean link target for the main site's "Careers" button (and iframe-embeddable).
 * Renders the exact same form as "/" — one form, one pipeline.
 */
export default function ApplyPage() {
  return <Landing />;
}
