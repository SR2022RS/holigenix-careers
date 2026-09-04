const BADGES = ["One-on-one care", "Weekly pay", "Flexible schedule"];

export function Hero() {
  return (
    <section className="hero">
      <h1>Join Our Nursing Team 💙</h1>
      <p>
        Thank you for your interest in joining our home healthcare team! If you&apos;re a
        nurse looking for one-on-one patient care, weekly pay, and a flexible schedule,
        we&apos;d love to connect with you.
      </p>
      <ul className="badges" aria-label="Why nurses choose Holigenix">
        {BADGES.map((b) => (
          <li key={b} className="badge">
            <span aria-hidden="true">✓</span> {b}
          </li>
        ))}
      </ul>
    </section>
  );
}
