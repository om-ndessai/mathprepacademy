import type { FormEvent } from "react";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";

import { Button } from "@mathprep/ui";

import { useAuth } from "../auth/authContext";
import { isGoogleSignInAvailable, signInDev, signInWithGoogle } from "../auth/authService";

export function LoginPage() {
  const { status, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const googleAvailable = isGoogleSignInAvailable();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (status === "signed-in") {
    return <Navigate to={from} replace />;
  }

  async function handleGoogle() {
    setSubmitting(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      setUser(user);
      void navigate(from, { replace: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Google sign-in failed");
      setSubmitting(false);
    }
  }

  async function handleDevSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const user = await signInDev(name.trim(), email.trim());
      setUser(user);
      void navigate(from, { replace: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="login">
      <section className="panel login-panel">
        <h2>Sign in</h2>
        <p>
          Sign in to take AMC 8, AMC 10, and AMC 12 assessments, track your scores, and build your
          study roadmap.
        </p>

        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}

        {googleAvailable ? (
          <Button
            className="google-signin"
            disabled={submitting}
            onClick={() => void handleGoogle()}
          >
            {submitting ? "Signing in…" : "Continue with Google"}
          </Button>
        ) : (
          <form onSubmit={(e) => void handleDevSubmit(e)} className="login-form">
            <label>
              Your name
              <input
                required
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                maxLength={120}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
            <p className="hint">
              Development sign-in — shown while Firebase credentials are not configured in{" "}
              <code>src/config/firebase.ts</code>.
            </p>
          </form>
        )}
      </section>
    </div>
  );
}
