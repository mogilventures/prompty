import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { HelmetProvider } from "react-helmet-async";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { createLazyRoute } from "@/utils/lazy";
import { Analytics } from "@vercel/analytics/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Lazy load page components for better bundle splitting
const Index = createLazyRoute(() => import("./pages/Index"), "homepage");
const NotFound = createLazyRoute(() => import("./pages/NotFound"), "404 page");
const Room = createLazyRoute(() => import("./pages/Room"), "room lobby");
const Login = createLazyRoute(() => import("./pages/Login"), "login");
const Signup = createLazyRoute(() => import("./pages/Signup"), "signup");
const GameClient = createLazyRoute(() => import("./pages/GameClient"), "game");
const Dashboard = createLazyRoute(() => import("./pages/Dashboard"), "dashboard");
const TermsOfService = createLazyRoute(() => import("./pages/TermsOfService"), "terms of service");

// Dev-only routes (only loaded in development)
const ImageGridDemo = import.meta.env.DEV ? createLazyRoute(() => import("./dev/ImageGridDemo"), "image grid demo") : null;
const InteractionsStyleGuide = import.meta.env.DEV ? createLazyRoute(() => import("./dev/InteractionsStyleGuide"), "style guide") : null;
const TestLogin = import.meta.env.DEV ? createLazyRoute(() => import("./dev/TestLogin"), "test login") : null;

const queryClient = new QueryClient();

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/" 
        element={isAuthenticated ? <Navigate to="/app/dashboard" replace /> : <Index />} 
      />
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/app/dashboard" replace /> : <Login />} 
      />
      <Route 
        path="/signup" 
        element={isAuthenticated ? <Navigate to="/app/dashboard" replace /> : <Signup />} 
      />
      
      {/* Dev-only routes (only available in development) */}
      {import.meta.env.DEV && ImageGridDemo && (
        <Route path="/dev/image-grid-demo" element={<ImageGridDemo />} />
      )}
      {import.meta.env.DEV && InteractionsStyleGuide && (
        <Route path="/dev/interactions-guide" element={<InteractionsStyleGuide />} />
      )}
      {import.meta.env.DEV && TestLogin && (
        <Route path="/dev/test-login" element={<TestLogin />} />
      )}

      {/* Legal pages */}
      <Route path="/terms" element={<TermsOfService />} />
      
      {/* Protected routes */}
      <Route 
        path="/app/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/room/:roomId" 
        element={
          <ProtectedRoute>
            <Room />
          </ProtectedRoute>
        } 
      />
      <Route
        path="/play/:roomId"
        element={
          <ProtectedRoute>
            <GameClient />
          </ProtectedRoute>
        }
      />

      {/* Debug route - remove in production */}
      <Route
        path="/debug/onboarding"
        element={
          <ProtectedRoute requireOnboarding={true}>
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Debug Onboarding Test</h1>
                <p className="text-muted-foreground">This should trigger onboarding for users without completed profiles</p>
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
            <Analytics />
          </TooltipProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
