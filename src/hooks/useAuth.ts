import { useAuthActions, useAuthToken } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useAuth() {
  const { signIn, signOut } = useAuthActions();
  const token = useAuthToken();
  const user = useQuery(api.users.getCurrentUser);
  
  const isAuthenticated = !!token;
  const isLoading = token === undefined || (isAuthenticated && user === undefined);
  
  // Only log auth state changes when debugging is needed
  // console.log("[useAuth] State:", {
  //   hasToken: !!token,
  //   isAuthenticated,
  //   isLoading,
  //   hasUser: !!user,
  //   userName: user?.displayName || user?.username,
  //   onboardingCompleted: user?.onboardingCompleted
  // });
  
  return {
    user,
    signIn,
    signOut,
    isAuthenticated,
    isLoading,
    isNewUser: user?.isNewUser === true,
    needsOnboarding: user && (!user.username || !user.onboardingCompleted),
  };
}