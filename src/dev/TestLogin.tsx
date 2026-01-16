/**
 * Test Login Page - For E2E testing only.
 *
 * This page uses the Password provider to allow E2E tests
 * to authenticate without email OTP verification.
 *
 * IMPORTANT: This page should only be accessible in development.
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "../../convex/_generated/api";

const TestLogin = () => {
  const navigate = useNavigate();
  const { signIn } = useAuthActions();
  const { isAuthenticated, user } = useAuth();
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flow, setFlow] = useState<"signUp" | "signIn">("signUp");
  const [completingOnboarding, setCompletingOnboarding] = useState(false);
  const onboardingAttempted = useRef(false);

  // Block access in production
  useEffect(() => {
    if (import.meta.env.PROD && !import.meta.env.VITE_ENABLE_TEST_LOGIN) {
      navigate("/login");
    }
  }, [navigate]);

  // Auto-complete onboarding for test users after auth
  useEffect(() => {
    const completeTestOnboarding = async () => {
      // Only run once, when user is authenticated but doesn't have onboarding completed
      if (
        isAuthenticated &&
        user &&
        !user.onboardingCompleted &&
        !completingOnboarding &&
        !onboardingAttempted.current
      ) {
        onboardingAttempted.current = true;
        setCompletingOnboarding(true);
        try {
          // Generate a username from the email prefix
          const emailPrefix = email.split("@")[0] || "testuser";
          const username = emailPrefix.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 20);
          const displayName = name || user.displayName || "Test User";

          await completeOnboarding({
            username,
            displayName,
          });
          console.log("[TestLogin] Onboarding completed for test user");
        } catch (err) {
          console.error("[TestLogin] Failed to complete onboarding:", err);
        } finally {
          setCompletingOnboarding(false);
        }
      }
    };

    completeTestOnboarding();
  }, [isAuthenticated, user, email, name, completeOnboarding, completingOnboarding]);

  // Navigate after successful auth AND onboarding
  useEffect(() => {
    if (isAuthenticated && user && user.onboardingCompleted) {
      navigate("/app/dashboard");
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      formData.append("flow", flow);

      // For signup, include name
      if (flow === "signUp" && name) {
        formData.append("name", name);
      }

      await signIn("password", formData);
    } catch (err) {
      console.error("Test login error:", err);
      setError(
        flow === "signUp"
          ? "Failed to create account. Try signing in instead."
          : "Failed to sign in. Check credentials or sign up first."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="container mx-auto max-w-md px-4 py-16"
      data-testid="test-login-page"
    >
      <div className="mb-6 rounded-lg border-2 border-yellow-500 bg-yellow-50 p-4 dark:bg-yellow-950">
        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
          E2E Test Login Page
        </p>
        <p className="text-xs text-yellow-700 dark:text-yellow-300">
          This page is for automated testing only.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h1 className="mb-4 text-xl font-semibold">Test Authentication</h1>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setFlow("signUp")}
            className={`flex-1 rounded px-3 py-2 text-sm ${
              flow === "signUp"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
            data-testid="signup-tab"
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => setFlow("signIn")}
            className={`flex-1 rounded px-3 py-2 text-sm ${
              flow === "signIn"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
            data-testid="signin-tab"
          >
            Sign In
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="test@example.com"
              required
              disabled={loading}
              data-testid="email-input"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="password123"
              required
              disabled={loading}
              data-testid="password-input"
            />
          </div>

          {flow === "signUp" && (
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium"
              >
                Display Name (optional)
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="Test User"
                disabled={loading}
                data-testid="name-input"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500" data-testid="error-message">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
            data-testid="submit-button"
          >
            {loading
              ? "Loading..."
              : flow === "signUp"
                ? "Create Account"
                : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
};

export default TestLogin;
