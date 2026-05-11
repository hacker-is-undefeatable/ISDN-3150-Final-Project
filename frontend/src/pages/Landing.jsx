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
      </div>

      <header className="landing-nav">
        <div className="landing-brand">
          <span className="landing-brand__mark" />
          <div>
            <p>AI Escape Room</p>
            <span>3D puzzle adventure</span>
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
          <p className="eyebrow">Interactive learning meets escape-room gameplay</p>
          <h1>AI Escape Room</h1>
          <p className="landing-copy">
            Step into a dark, atmospheric puzzle world where every checkpoint turns
            learning into exploration. Solve the room, unlock the path, and keep your
            progress synced through Supabase.
          </p>

          <div className="landing-hero__actions">
            <Link className="primary-button" to="/login">
              Start Game
            </Link>
            <Link className="secondary-button" to="/register">
              Create Account
            </Link>
          </div>

          <div className="landing-metrics">
            <article>
              <strong>Secure</strong>
              <span>Email and password login</span>
            </article>
            <article>
              <strong>Persistent</strong>
              <span>Session survives refresh</span>
            </article>
            <article>
              <strong>Immersive</strong>
              <span>3D world with puzzle loop</span>
            </article>
          </div>
        </div>

        <aside className="landing-preview">
          <div className="landing-preview__panel">
            <div className="landing-preview__header">
              <span className="status-dot" />
              <span>{isAuthenticated ? "Ready to continue" : "Awaiting login"}</span>
            </div>
            <video className="landing-preview__scene" autoPlay muted loop>
              <source src="/demo.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <p>
              Explore the temple, trigger puzzles near glowing spots, and escape with
              the room state preserved across your session.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
