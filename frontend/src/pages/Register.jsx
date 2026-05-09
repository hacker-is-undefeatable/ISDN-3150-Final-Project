import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function validateEmail(value) {
  return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(value);
}

export default function Register() {
  const navigate = useNavigate();
  const { signUp, session, loading, configError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      navigate("/game", { replace: true });
    }
  }, [loading, navigate, session]);

  if (!loading && session) {
    return <Navigate to="/game" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFieldError("");
    setFormError("");
    setSuccessMessage("");

    if (!validateEmail(email)) {
      setFieldError("Enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setFieldError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setFieldError("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      const result = await signUp(email.trim(), password);

      if (result.session) {
        navigate("/game", { replace: true });
        return;
      }

      setSuccessMessage("Account created. Check your email to confirm your signup, then log in.");
    } catch (error) {
      setFormError(error.message || "Unable to create account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-card__header">
          <span className="eyebrow">New adventurer</span>
          <h1>Register</h1>
          <p>Create your Supabase account to keep the room session saved.</p>
        </div>

        {configError && <div className="auth-alert auth-alert--warning">{configError}</div>}
        {fieldError && <div className="auth-alert">{fieldError}</div>}
        {formError && <div className="auth-alert">{formError}</div>}
        {successMessage && <div className="auth-alert auth-alert--success">{successMessage}</div>}

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
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
          </label>

          <label className="auth-field">
            <span>Confirm password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat your password"
              autoComplete="new-password"
            />
          </label>

          <button className="primary-button primary-button--full" type="submit" disabled={submitting}>
            {submitting ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-switch">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
