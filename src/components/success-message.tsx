export function SuccessMessage() {
  return (
    <div className="success" role="status" aria-live="polite">
      <div className="success__icon" aria-hidden="true">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h2>Thank you!</h2>
      <p>
        Thank you! We&apos;ve received your information. When we have cases available in
        your area that match your interests and availability, a member of our team will
        reach out to help you get started. Let&apos;s stay connected!
      </p>
    </div>
  );
}
