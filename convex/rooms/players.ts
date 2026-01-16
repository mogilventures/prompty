/**
 * Player management functionality
 */
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Leave a room
 */
export const leaveRoom = mutation({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    const player = await ctx.db
      .query("players")
      .withIndex("by_room_and_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", user._id)
      )
      .unique();

    if (!player) throw new Error("Not in this room");

    // If host is leaving and game hasn't started, transfer host or close room
    if (player.isHost && room.status === "waiting") {
      const otherPlayers = await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
        .filter((q) =>
          q.and(
            q.neq(q.field("userId"), user._id),
            q.eq(q.field("status"), "connected")
          )
        )
        .collect();

      if (otherPlayers.length > 0) {
        // Transfer host to next player
        await ctx.db.patch(otherPlayers[0]._id, { isHost: true });
        await ctx.db.patch(room._id, { hostId: otherPlayers[0].userId });
      } else {
        // Close room if no other players
        await ctx.db.patch(room._id, { status: "finished", finishedAt: Date.now() });
      }
    }

    // Remove or disconnect player
    if (room.status === "waiting") {
      await ctx.db.delete(player._id);
    } else {
      await ctx.db.patch(player._id, { status: "disconnected" });
    }

    return null;
  },
});

/**
 * Kick a player (host only)
 */
export const kickPlayer = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.id("players"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    const user = await ctx.db.get(userId);
    if (!user || user._id !== room.hostId) {
      throw new Error("Only the host can kick players");
    }

    const targetPlayer = await ctx.db.get(args.playerId);
    if (!targetPlayer) throw new Error("Player not found");

    if (targetPlayer.isHost) {
      throw new Error("Cannot kick the host");
    }

    await ctx.db.patch(args.playerId, {
      status: "kicked",
    });

    return null;
  },
});
