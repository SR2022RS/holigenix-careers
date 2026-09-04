import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/** Header + footer chrome for the marketing pages. /scan deliberately sits outside this group. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="page">{children}</main>
      <SiteFooter />
    </>
  );
}
