import Image from "next/image";
import Link from "next/link";
import logo from "../../public/logo/holigenix-logo.png";

/**
 * Header. The logo is the official Holigenix Healthcare lockup, shown on a
 * white pill exactly as www.holigenixhealthcare.com does it, so it reads
 * correctly on the navy→teal gradient.
 */
export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="logo-link" aria-label="Holigenix Healthcare — home">
          <Image
            src={logo}
            alt="Holigenix Healthcare — Home Health Care"
            className="logo-img"
            width={215}
            height={100}
            priority
            sizes="215px"
          />
        </Link>
        <span className="header-pill">Now hiring nurses</span>
      </div>
    </header>
  );
}
