/**
 * Room settings management
 */
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Update room settings (host only)
 */
export const updateRoomSettings = mutation({
  args: {
    roomId: v.id("rooms"),
    settings: v.object({
      maxPlayers: v.optional(v.float64()),
      roundsPerGame: v.optional(v.float64()),
      timePerRound: v.optional(v.float64()),
      isPrivate: v.optional(v.boolean()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    if (room.status !== "waiting") {
      throw new Error("Cannot change settings after game starts");
    }

    const user = await ctx.db.get(userId);
    if (!user || user._id !== room.hostId) {
      throw new Error("Only the host can update settings");
    }

    // Validate settings
    const newSettings = { ...room.settings };

    if (args.settings.maxPlayers !== undefined) {
      if (args.settings.maxPlayers < 2 || args.settings.maxPlayers > 12) {
        throw new Error("Max players must be between 2 and 12");
      }
      newSettings.maxPlayers = args.settings.maxPlayers;
    }

    if (args.settings.roundsPerGame !== undefined) {
      if (args.settings.roundsPerGame < 1 || args.settings.roundsPerGame > 10) {
        throw new Error("Rounds must be between 1 and 10");
      }
      newSettings.roundsPerGame = args.settings.roundsPerGame;
    }

    if (args.settings.timePerRound !== undefined) {
      if (args.settings.timePerRound < 30 || args.settings.timePerRound > 300) {
        throw new Error("Time per round must be between 30 and 300 seconds");
      }
      newSettings.timePerRound = args.settings.timePerRound;
    }

    if (args.settings.isPrivate !== undefined) {
      newSettings.isPrivate = args.settings.isPrivate;
    }

    await ctx.db.patch(args.roomId, { settings: newSettings });

    return null;
  },
});
