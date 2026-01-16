/**
 * Room joining functionality
 */
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Join a room by code
 */
export const joinRoom = mutation({
  args: {
    code: v.string(),
  },
  returns: v.object({
    roomId: v.id("rooms"),
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get current user
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    if (!user.onboardingCompleted) {
      throw new Error("Please complete onboarding first");
    }

    // Find room by code (case-insensitive)
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique();

    if (!room) {
      throw new Error("Room not found");
    }

    // Check room status
    if (room.status !== "waiting" && !room.settings.allowLateJoin) {
      throw new Error("Game already started");
    }

    if (room.status === "finished") {
      throw new Error("Game has ended");
    }

    // Check if already in room
    const existingPlayer = await ctx.db
      .query("players")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", room._id).eq("userId", user._id)
      )
      .unique();

    if (existingPlayer) {
      if (existingPlayer.status === "kicked") {
        throw new Error("You have been kicked from this room");
      }

      // Reconnect existing player
      await ctx.db.patch(existingPlayer._id, {
        status: "connected",
        lastSeenAt: Date.now(),
      });
    } else {
      // Check room capacity
      const activePlayers = await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .filter((q) => q.neq(q.field("status"), "kicked"))
        .collect();

      if (activePlayers.length >= room.settings.maxPlayers) {
        throw new Error("Room is full");
      }

      // Add as new player
      await ctx.db.insert("players", {
        roomId: room._id,
        userId: user._id,
        status: "connected",
        isHost: false,
        score: 0,
        joinedAt: Date.now(),
        lastSeenAt: Date.now(),
      });
    }

    return { roomId: room._id, success: true };
  },
});
