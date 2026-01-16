import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAuthActions } from "@convex-dev/auth/react";
import { Loader2 } from "lucide-react";
import { OnboardingWizard } from "./OnboardingWizard";

interface ProtectedRouteProps {
  children: ReactNode;
  requireOnboarding?: boolean;
}

export function ProtectedRoute({ children, requireOnboarding = true }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated, needsOnboarding } = useAuth();
  const { signIn } = useAuthActions();
  const location = useLocation();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authStable, setAuthStable] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Just redirect to login if not authenticated - no auto signin
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect happens automatically by the component return
    }
  }, [isLoading, isAuthenticated]);

  // Add authentication stabilization to prevent race conditions
  useEffect(() => {
    if (isAuthenticated && user !== undefined) {
      console.log("[ProtectedRoute] Auth state stabilized", { user: user?.displayName || user?.username || "User" });
      // Add small delay to ensure authentication context is fully established
      const timer = setTimeout(() => {
        setAuthStable(true);
        setIsSigningIn(false);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAuthStable(false);
    }
  }, [isAuthenticated, user]);

  // Check if user needs onboarding and show modal
  useEffect(() => {
    if (requireOnboarding && user && authStable) {
      const needsOnboarding = !user.username || !user.onboardingCompleted;
      setShowOnboarding(needsOnboarding);
    } else {
      setShowOnboarding(false);
    }
  }, [requireOnboarding, user, authStable]);

  // Show loading state while checking auth, signing in, or stabilizing
  if (isLoading || isSigningIn || (isAuthenticated && !authStable)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <div className="text-sm text-muted-foreground">
            {isLoading && "Loading..."}
            {isSigningIn && `Signing in${retryCount > 0 ? ` (attempt ${retryCount + 1})` : ""}...`}
            {isAuthenticated && !authStable && "Setting up session..."}
          </div>
          {lastError && retryCount > 0 && (
            <div className="text-xs text-destructive">
              Retrying after error: {lastError}
            </div>
          )}
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Handlers for onboarding wizard
  const handleOnboardingComplete = () => {
    console.log("[ProtectedRoute] Onboarding completed");
    setShowOnboarding(false);
  };

  const handleOnboardingClose = () => {
    // Don't allow closing without completing if onboarding is required
    if (!user?.onboardingCompleted && requireOnboarding) {
      console.log("[ProtectedRoute] Cannot close onboarding - not completed");
      return;
    }
    setShowOnboarding(false);
  };

  return (
    <>
      {children}
      {showOnboarding && (
        <OnboardingWizard
          open={showOnboarding}
          onComplete={handleOnboardingComplete}
          onClose={handleOnboardingClose}
        />
      )}
    </>
  );
}