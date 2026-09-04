import type { NextConfig } from "next";

/**
 * The main site (www.holigenixhealthcare.com) may iframe-embed /apply.
 * Next.js sends no X-Frame-Options by default, so embedding already works;
 * this CSP narrows it to our own domains rather than leaving it open to anyone.
 */
const FRAME_ANCESTORS = [
  "'self'",
  "https://holigenixhealthcare.com",
  "https://www.holigenixhealthcare.com",
  "https://*.holigenixhealthcare.com",
].join(" ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: `frame-ancestors ${FRAME_ANCESTORS}` },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
