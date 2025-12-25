import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ResendOTP } from "./ResendOTP";

// Password provider for E2E testing - allows programmatic sign-in without email OTP
const TestPassword = Password({
  id: "password",
  // No email verification required for test accounts
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  // Include Password provider for E2E testing alongside OTP for production
  providers: [ResendOTP, TestPassword],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) {
        const existingUser = await ctx.db.get(args.existingUserId);
        if (existingUser) {
          await ctx.db.patch(existingUser._id, {
            lastActiveAt: Date.now(),
          });
          return existingUser._id;
        }
      }

      // All users are email users now
      const userData = {
        ...args.profile,
        email: args.profile?.email,
        lastActiveAt: Date.now(),
        onboardingCompleted: false, // All users need username setup
        isNewUser: true,
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
      };

      const userId = await ctx.db.insert("users", userData);
      return userId;
    },
  },
});