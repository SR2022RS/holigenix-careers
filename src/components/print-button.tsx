"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      className="btn btn--secondary scan__print no-print"
      onClick={() => window.print()}
    >
      Print this page
    </button>
  );
}
