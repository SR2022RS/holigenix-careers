import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="wordmark" aria-label="Holigenix Healthcare — home">
          <svg
            className="wordmark__mark"
            viewBox="0 0 34 34"
            aria-hidden="true"
            focusable="false"
          >
            <rect x="1" y="1" width="32" height="32" rx="9" fill="#ffffff" />
            <path
              d="M17 26.5 8.6 18.4a4.7 4.7 0 0 1 6.65-6.65L17 13.5l1.75-1.75a4.7 4.7 0 0 1 6.65 6.65Z"
              fill="#0d7a8c"
            />
            <path d="M15.5 12.5h3v9h-3zM12.5 15.5h9v3h-9z" fill="#f4a340" />
          </svg>
          <span className="wordmark__text">
            Holigenix
            <span className="wordmark__sub">Healthcare</span>
          </span>
        </Link>
        <span className="header-pill">Now hiring nurses</span>
      </div>
    </header>
  );
}
