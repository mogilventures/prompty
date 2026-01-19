import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/8bit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/8bit/card";
import { Input } from "@/components/ui/8bit/input";
import { Label } from "@/components/ui/8bit/label";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Mail, KeyRound, User, LogOut } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signOut } = useAuthActions();
  const { user, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canonical =
    typeof window !== "undefined"
      ? `${window.location.origin}/login`
      : "/login";

  // Auto-navigate when authentication succeeds (only after form submission)
  useEffect(() => {
    if (isAuthenticated && isSubmitting) {
      // Redirect to the page they were trying to access, or dashboard as fallback
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/app/dashboard";
      console.log("Authentication successful, navigating to:", from);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isSubmitting, navigate, location]);

  // Stop loading when auth state updates after OTP verification
  useEffect(() => {
    if (step === "code" && isAuthenticated) {
      setLoading(false);
    } else if (step === "code" && error) {
      setLoading(false);
    }
  }, [step, isAuthenticated, error]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("email", email);
      await signIn("resend-otp", formData);
      setStep("code");
    } catch (err) {
      setError("Failed to send code. Please check your email and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("code", code);
      
      console.log("Attempting to verify code with email:", email, "and code:", code);
      await signIn("resend-otp", formData);
      console.log("Sign in successful, waiting for auth state to update...");
      
      // The useEffect will handle navigation when isAuthenticated becomes true
    } catch (err) {
      console.error("Sign in error:", err);
      setError("Invalid or expired code. Please try again.");
      setLoading(false);
    }
  };


  const handleBack = () => {
    setStep("email");
    setCode("");
    setError(null);
  };

  // Show sign out option if already authenticated
  if (isAuthenticated && !isSubmitting) {
    return (
      <>
        <Helmet>
          <title>Login | AI Image Party</title>
          <meta
            name="description"
            content="Login to AI Image Party to create and join rooms for collaborative AI image fun. Secure sign-in with OTP email verification."
          />
          <link rel="canonical" href={canonical} />
        </Helmet>
        <main className="container mx-auto max-w-md px-4 py-16">
          <Card>
            <CardHeader>
              <CardTitle>Already signed in</CardTitle>
              <CardDescription>
                You're already signed in as {user?.displayName || user?.username || "User"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => navigate("/app/dashboard")} className="w-full">
                Go to Dashboard
              </Button>
              <Button variant="outline" onClick={async () => { await signOut(); setIsSubmitting(false); }} className="w-full">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out to Use Different Account
              </Button>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Login | AI Image Party</title>
        <meta
          name="description"
          content="Login to AI Image Party to create and join rooms for collaborative AI image fun. Secure sign-in with OTP email verification."
        />
        <link rel="canonical" href={canonical} />
      </Helmet>
      <main className="container mx-auto max-w-md px-4 py-16">
        <section aria-labelledby="login-title">
          <div className="flex flex-col gap-6 font-display">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Sign in or create account</CardTitle>
                <CardDescription className="text-xs">
                  {step === "email" 
                    ? "Enter your email to sign in or create a new account" 
                    : `We sent a 6-digit code to ${email}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {step === "email" ? (
                  <form onSubmit={handleSendCode} className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                        disabled={loading}
                        autoFocus
                      />
                    </div>
                    
                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Sending..." : "Send Code"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyCode} className="space-y-4">
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="6-digits"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="pl-10 text-center text-2xl tracking-widest placeholder:text-base placeholder:tracking-normal"
                        maxLength={6}
                        pattern="[0-9]{6}"
                        required
                        disabled={loading}
                        autoFocus
                      />
                    </div>
                    
                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}

                    <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                      {loading ? "Verifying..." : "Sign In"}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={handleBack}
                      disabled={loading}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Use Different Email
                    </Button>
                    
                    <p className="text-center text-sm text-muted-foreground">
                      Didn't receive the code?{" "}
                      <button
                        type="button"
                        onClick={async () => {
                          const syntheticEvent = {
                            preventDefault: () => {},
                            currentTarget: null,
                          } as React.FormEvent;
                          await handleSendCode(syntheticEvent);
                        }}
                        className="underline hover:text-primary"
                        disabled={loading}
                      >
                        Resend
                      </button>
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
            <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
              By signing in, you agree to our <Link to="/terms">Terms of Service</Link> and <Link to="/terms">Privacy Policy</Link>.
              New accounts will be created automatically.
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default Login;
