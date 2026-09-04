import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import "./globals.css";

// Same typefaces as www.holigenixhealthcare.com. Self-hosted at build time by next/font.
const display = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `Join Our Nursing Team · ${SITE_NAME}`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Holigenix Healthcare is hiring nurses for one-on-one pediatric home care in Georgia. Weekly pay, flexible schedule. Leave your info and we'll reach out.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Join Our Nursing Team",
    description:
      "One-on-one patient care, weekly pay, and a flexible schedule. Leave your information and a member of our team will reach out.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0f2b3d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
