import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <main className="landing-shell">
      <div className="landing-shell__bg" aria-hidden="true">
        <span className="landing-shell__orb landing-shell__orb--one" />
        <span className="landing-shell__orb landing-shell__orb--two" />
        <span className="landing-shell__grid" />
        <div className="landing-shell__scanlines" />
      </div>

      <header className="landing-nav">
        <div className="landing-brand">
          <span className="landing-brand__mark" />
          <div>
            <p>TEMPLE ESCAPE</p>
            <span>3D AI Puzzle Adventure</span>
          </div>
        </div>
        <div className="landing-nav__actions">
          <Link className="text-link" to="/login">
            Login
          </Link>
          <Link className="text-link" to="/register">
            Register
          </Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero__content">
          <p className="eyebrow">◆ ESCAPE ROOM PROTOCOL INITIATED</p>
          <h1>Enter The Temple</h1>
          <p className="landing-copy">
            A dark, atmospheric puzzle world awaits. Explore ancient ruins, solve cryptic 
            challenges, unlock hidden passages, and race against time to escape. Every decision 
            matters. Your progress persists across sessions.
          </p>

          <div className="landing-hero__actions">
            <Link className="primary-button" to="/login">
              ▶ START ADVENTURE
            </Link>
            <Link className="secondary-button" to="/register">
              ◇ CREATE ACCOUNT
            </Link>
          </div>

          <div className="landing-metrics">
            <article>
              <strong>SECURE</strong>
              <span>Encrypted authentication</span>
            </article>
            <article>
              <strong>PERSISTENT</strong>
              <span>State saved instantly</span>
            </article>
            <article>
              <strong>IMMERSIVE</strong>
              <span>Full 3D exploration</span>
            </article>
          </div>
        </div>

        <aside className="landing-preview">
          <div className="landing-preview__panel">
            <div className="landing-preview__header">
              <span className="status-dot" />
              <span>{isAuthenticated ? "▪ READY" : "⊙ AWAITING ACCESS"}</span>
            </div>
            <video className="landing-preview__scene" autoPlay muted loop>
              <source src="/demo.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <p>
              Uncover secrets, trigger ancient mechanisms, and piece together the puzzle. 
              Your temple exploration progress is automatically preserved.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
