import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function validateEmail(value) {
  return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(value);
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, session, loading, configError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const destination = location.state?.from?.pathname || "/game";

  useEffect(() => {
    if (!loading && session) {
      navigate(destination, { replace: true });
    }
  }, [destination, loading, navigate, session]);

  if (!loading && session) {
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFieldError("");
    setFormError("");

    if (!validateEmail(email)) {
      setFieldError("Enter a valid email address.");
      return;
    }

    if (!password.trim()) {
      setFieldError("Enter your password.");
      return;
    }

    try {
      setSubmitting(true);
      await signIn(email.trim(), password);
      navigate(destination, { replace: true });
    } catch (error) {
      setFormError(error.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-card__header">
          <span className="eyebrow">Welcome back</span>
          <h1>Login</h1>
          <p>Access your saved escape-room session with Supabase auth.</p>
        </div>

        {configError && <div className="auth-alert auth-alert--warning">{configError}</div>}
        {fieldError && <div className="auth-alert">{fieldError}</div>}
        {formError && <div className="auth-alert">{formError}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </label>

          <button className="primary-button primary-button--full" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="auth-switch">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
