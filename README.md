# holigenix-careers

Holigenix Healthcare's nurse-recruitment landing page — **careers.holigenixhealthcare.com**.

A small, public, static-first Next.js (App Router) site. It has one job: capture a
nurse's contact details and hand them to GoHighLevel. It is a marketing property,
completely separate from CarePortal and the parent portal.

> **Airgapped from PHI by design.** No Supabase, no auth, no database, no patient data,
> no imports from any other Holigenix app, no `localStorage`/`sessionStorage`.
> The only outbound call is one server-side POST to a GoHighLevel webhook.

## Two entry points, one form, one pipeline

Nurses reach the form two ways. Both land on the same page and the same webhook:

| Entry | URL |
| --- | --- |
| Printed QR code (hospital flyers) | `https://careers.holigenixhealthcare.com/?src=qr-choa` |
| "Careers" / "Join Our Team" button on www.holigenixhealthcare.com | `https://careers.holigenixhealthcare.com/apply` |

There is exactly one `<RecruitForm>` component ([src/components/recruit-form.tsx](src/components/recruit-form.tsx)).
`/` and `/apply` both render it. Do not copy it anywhere else.

### Routes

| Route | What it is |
| --- | --- |
| `/` | Hero + recruitment form. Primary QR-scan destination. |
| `/apply` | Same page. Clean link target for the main site's Careers button; iframe-embeddable. |
| `/thank-you` | Standalone success page (the form also shows success inline). |
| `/scan` | Print-ready "Scan Me" flyer with the QR code. No header/footer. |
| `POST /api/lead` | Tiny proxy: validates the form JSON and forwards it to GoHighLevel. |

## Local development

```bash
npm ci
cp .env.example .env.local     # fill in the webhook URL, or leave blank to test without sending
npm run dev                    # http://localhost:3000
```

Other scripts:

| Script | Does |
| --- | --- |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run qr` | Regenerate the QR code files in `public/qr/` (see **QR CODE**) |

## Form → GoHighLevel

The form validates client-side (required fields, email format, 10-digit phone), then
`fetch` POSTs to this site's own `/api/lead` route. That route re-validates, drops
honeypot submissions, and forwards this JSON to the webhook in `GHL_RECRUIT_WEBHOOK`:

```json
{
  "full_name":    "Jane Doe",
  "email":        "jane@example.com",
  "phone":        "4045550123",
  "license_type": "RN — Registered Nurse",
  "city":         "Decatur",
  "state":        "GA",
  "zip":          "30030",
  "source":       "qr-choa",
  "submitted_at": "2026-09-04T14:02:11.512Z"
}
```

- `phone` is normalized to 10 digits (a leading `+1` is dropped).
- `license_type` is one of: `RN — Registered Nurse`, `LPN — Licensed Practical Nurse`,
  `CNA / PCA`, `Nursing student`, `Other`.
- `source` comes from the `?src=` query param (see **Lead-source tracking**).
- `submitted_at` is an ISO-8601 UTC timestamp set in the browser.

**Why a proxy instead of posting straight to GHL from the browser:** the webhook URL never
ships in the client bundle, delivery does not depend on GHL answering CORS preflight from
our domain, and failures show up in Vercel's function logs rather than only in a nurse's
phone browser console. It is one small Node function; every page is still static.

**Fail soft.** If forwarding errors (network, non-2xx, webhook unset), the candidate still
sees the success message. The failure is logged server-side (Vercel → Logs) and mirrored as
a browser console warning. A nurse standing in a hospital hallway must never see a raw
error or a stuck form.

### Setting `GHL_RECRUIT_WEBHOOK` in Vercel

1. In GoHighLevel: **Automation → Workflows → (your recruiting workflow)**. Its trigger
   must be **Inbound Webhook**. Copy the URL GHL shows on the trigger
   (`https://services.leadconnectorhq.com/hooks/…/webhook-trigger/…`).
2. In Vercel: **Project → Settings → Environment Variables → Add**
   - Key: `GHL_RECRUIT_WEBHOOK`
   - Value: the URL from step 1
   - Environments: **Production** (and Preview if you want previews to post real leads;
     otherwise leave Preview empty and the route logs instead of sending).
   - It is server-only, so it is safe to leave unmarked as "sensitive" or mark it — either works.
3. **Redeploy.** Vercel bakes env values into a deployment; changing the value does
   nothing until the next deploy (`vercel --prod`, or Deployments → Redeploy).

Or from the CLI:

```bash
vercel env add GHL_RECRUIT_WEBHOOK production
vercel --prod
```

`NEXT_PUBLIC_GHL_RECRUIT_WEBHOOK` is honoured as a fallback name, but prefer the
server-only one.

In GHL, map the incoming JSON keys above to contact fields in the workflow, and branch
on `source` if you want QR leads tagged differently from website leads.

## Lead-source tracking: the `?src=` convention

Any link into this site can carry `?src=<token>`. The form reads it in the browser and
posts it as `source`. When absent, `source` is `website`.

| Link | `source` value | Meaning |
| --- | --- | --- |
| `https://careers.holigenixhealthcare.com/?src=qr-choa` | `qr-choa` | The printed QR code (Children's Healthcare of Atlanta flyers) |
| `https://careers.holigenixhealthcare.com/apply` | `website` | Main-site Careers button (default) |
| `https://careers.holigenixhealthcare.com/?src=qr-grady` | `qr-grady` | Example: a second QR batch for another hospital |

Rules: lowercase, letters/digits/`-`/`_` only (anything else is stripped), max 64 chars.
Use `qr-<site>` for printed codes so they sort together in GHL. Add new tokens freely —
nothing in the code needs to change; only the GHL workflow needs to know the new value.

## QR CODE

The printed "Scan Me" QR and the site it opens live in this one repo so they can never
drift apart.

1. **What it encodes:** `${SITE_URL}/?src=qr-choa`, i.e.
   `https://careers.holigenixhealthcare.com/?src=qr-choa`. It is the absolute production
   URL with the tracking param baked in — a QR has no page to resolve a relative link
   against, and `?src=qr-choa` is what lets GHL tell a flyer lead from a website lead.
2. **How to regenerate:** `npm run qr`. This runs [scripts/generate-qr.ts](scripts/generate-qr.ts),
   which prints the encoded URL to the console and writes:
   - `public/qr/scan-me.svg` — **the print master.** Vector; scales to any size with no
     quality loss. Give this file to a print shop.
   - `public/qr/scan-me.png` — 1200×1200 preview for quick sharing.

   Both use error-correction level **H** (survives smudging/tearing) and navy `#0f2b3d`
   on white for brand match and high scan contrast. The generated files are committed.
3. **Changing the destination:** there is one place to change it. Set
   `NEXT_PUBLIC_SITE_URL` (in `.env.local` locally, or Vercel env for a deploy), then
   re-run `npm run qr` and commit the new files. `SITE_URL` in
   [src/lib/config.ts](src/lib/config.ts) is the single source of truth — the app's
   canonical/Open Graph tags, the `/scan` page, and the QR generator all import it.
   The URL is not written anywhere else.
4. **Printing from the browser:** open `https://careers.holigenixhealthcare.com/scan`
   and print. The page is just "SCAN ME", the QR, and the domain, with print styles that
   drop everything else. For a print shop, use `scan-me.svg` directly.

## DNS SETUP

The domain `holigenixhealthcare.com` is registered at GoDaddy (nameservers stay at
GoDaddy). The parent domain is already in the `sr2022rs-projects` Vercel team, and
`careers.holigenixhealthcare.com` is already attached to the `holigenix-careers` project.
The only outstanding step is one DNS record at GoDaddy.

1. ~~First deploy~~ — done; the project is linked to `SR2022RS/holigenix-careers` and
   every push to `main` deploys to production.
2. ~~Add the domain in Vercel~~ — done. `notes.` and `www.` already use the same shape:

   | Type | Name (host) | Value | TTL |
   | --- | --- | --- | --- |
   | `CNAME` | `careers` | `cname.vercel-dns.com` | 600 (or default) |

   Only if Vercel's Domains page tells you to use an A record instead (it does this for
   apex domains, not subdomains), use:

   | Type | Name | Value |
   | --- | --- | --- |
   | `A` | `careers` | `76.76.21.21` |

   **Trust the values shown on the Vercel Domains page over this README** if they
   differ — Vercel occasionally issues project-specific CNAME targets.
3. In GoDaddy: **My Products → holigenixhealthcare.com → DNS → Add** the record above.
   Remove any existing `careers` record first.
4. Back in Vercel, the domain flips to **Valid Configuration** once DNS propagates
   (usually minutes, up to 48h). Vercel issues the TLS certificate automatically.
5. Set `NEXT_PUBLIC_SITE_URL=https://careers.holigenixhealthcare.com` in Vercel env
   (it is also the default, so this is belt-and-braces) and redeploy.

### Linking from the main site

On **www.holigenixhealthcare.com**, the "Careers" / "Join Our Team" button should link to:

```
https://careers.holigenixhealthcare.com/apply
```

(or the site root — they render the same form). To embed instead of link:

```html
<iframe
  src="https://careers.holigenixhealthcare.com/apply"
  title="Join Our Nursing Team"
  style="width:100%;min-height:1100px;border:0"
  loading="lazy"
></iframe>
```

This site sends `Content-Security-Policy: frame-ancestors` allowing `holigenixhealthcare.com`
and its subdomains only (see [next.config.ts](next.config.ts)), so it can be embedded on
the main site but not on random third-party pages.

## Brand

| Token | Hex |
| --- | --- |
| Navy | `#0f2b3d` |
| Teal | `#0d7a8c` |
| Amber (accent / CTA) | `#f4a340` |
| Light | `#e6f4f6` |
| Ink | `#1a2b34` |

Header is a navy→teal gradient carrying the official Holigenix Healthcare lockup
(`public/logo/holigenix-logo.png`, the same file www.holigenixhealthcare.com serves) on a
white pill, mirroring the main site's `.logo-img` treatment. The favicon (`src/app/icon.png`)
is the house-and-heart mark cropped from that lockup. Typefaces match the main site:
**Fraunces** for headings, **Plus Jakarta Sans** for body, self-hosted at build by `next/font`.

Mobile-first: most traffic is phones scanning a QR. All tap targets ≥ 44px; inputs are
17px so iOS doesn't zoom on focus.

## Project layout

```
src/
  app/
    layout.tsx           root <html>/<body>, metadata (canonical + OG from SITE_URL)
    globals.css          brand tokens, form styles, print styles
    (site)/              header + footer chrome
      layout.tsx
      page.tsx           /
      apply/page.tsx     /apply
      thank-you/page.tsx /thank-you
    scan/page.tsx        /scan  (outside the chrome group on purpose)
    api/lead/route.ts    POST /api/lead — validate + forward to GHL (server-only)
  components/
    recruit-form.tsx     THE form (client component; fetch POST, inline validation)
    landing.tsx          hero + form, shared by / and /apply
    hero.tsx, site-header.tsx, site-footer.tsx, success-message.tsx, print-button.tsx
  lib/
    config.ts            SITE_URL, QR_TARGET_URL, webhook env, license types, copy constants
    lead.ts              payload shape, validation, ?src= parsing, fail-soft submit to /api/lead
    ghl.ts               server-only forwarder to GHL_RECRUIT_WEBHOOK
scripts/
  generate-qr.ts         npm run qr
public/qr/
  scan-me.svg            print master (committed)
  scan-me.png            1200×1200 preview (committed)
```
