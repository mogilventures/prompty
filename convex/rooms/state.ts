/**
 * Room state queries
 */
import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get room state (real-time subscription)
 */
export const getRoomState = query({
  args: {
    roomId: v.id("rooms"),
  },
  returns: v.union(
    v.null(),
    v.object({
      room: v.object({
        _id: v.id("rooms"),
        code: v.string(),
        name: v.string(),
        status: v.string(),
        settings: v.object({
          maxPlayers: v.float64(),
          roundsPerGame: v.float64(),
          timePerRound: v.float64(),
          isPrivate: v.boolean(),
          allowLateJoin: v.boolean(),
        }),
        currentRound: v.optional(v.float64()),
      }),
      players: v.array(v.object({
        _id: v.id("players"),
        userId: v.id("users"),
        username: v.string(),
        displayName: v.string(),
        status: v.string(),
        isHost: v.boolean(),
        score: v.float64(),
      })),
      isHost: v.boolean(),
      canStart: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return null;

    const userId = await getAuthUserId(ctx);
    const currentUser = userId ? await ctx.db.get(userId) : null;

    // Get all players with user info (excluding kicked players)
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.neq(q.field("status"), "kicked"))
      .collect();

    const playersWithInfo = await Promise.all(
      players.map(async (player) => {
        const user = await ctx.db.get(player.userId);
        return {
          _id: player._id,
          userId: player.userId,
          username: user?.username ?? "Guest",
          displayName: user?.displayName ?? user?.username ?? "Guest",
          status: player.status,
          isHost: player.isHost,
          score: player.score,
        };
      })
    );

    const connectedPlayers = playersWithInfo.filter(p => p.status === "connected");

    return {
      room: {
        _id: room._id,
        code: room.code,
        name: room.name,
        status: room.status,
        settings: room.settings,
        currentRound: room.currentRound,
      },
      players: playersWithInfo,
      isHost: currentUser?._id === room.hostId,
      canStart: room.status === "waiting" && connectedPlayers.length >= 2,
    };
  },
});

/**
 * Get list of public rooms
 */
export const getPublicRooms = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("rooms"),
    code: v.string(),
    name: v.string(),
    hostName: v.string(),
    playerCount: v.float64(),
    maxPlayers: v.float64(),
    status: v.string(),
  })),
  handler: async (ctx) => {
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .collect();

    const publicRooms = rooms.filter(r => !r.settings.isPrivate);

    const roomsWithInfo = await Promise.all(
      publicRooms.slice(0, 20).map(async (room) => {
        const host = await ctx.db.get(room.hostId);
        const players = await ctx.db
          .query("players")
          .withIndex("by_room", (q) => q.eq("roomId", room._id))
          .filter((q) => q.eq(q.field("status"), "connected"))
          .collect();

        return {
          _id: room._id,
          code: room.code,
          name: room.name,
          hostName: host?.displayName ?? "Unknown",
          playerCount: players.length,
          maxPlayers: room.settings.maxPlayers,
          status: room.status,
        };
      })
    );

    return roomsWithInfo;
  },
});
