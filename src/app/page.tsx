export default function Home() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        minHeight: "100vh",
        padding: "4rem 2rem 2rem",
        textAlign: "center",
        fontFamily: "var(--font-geist-sans), sans-serif",
      }}
    >
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          gap: "1rem",
        }}
      >
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          Autonomous Product & Software Factory
        </h1>
        <p
          style={{
            fontSize: "1.25rem",
            opacity: 0.8,
          }}
        >
          The assembly line is live.
        </p>
      </main>

      <footer
        style={{
          fontSize: "0.875rem",
          opacity: 0.6,
        }}
      >
        <p>Deployed via Coolify — push to main to redeploy</p>
      </footer>
    </div>
  );
}

