/**
 * Room management module
 *
 * Re-exports all room-related functionality for convenient imports.
 *
 * API paths after split:
 * - api.rooms.create.createRoom
 * - api.rooms.join.joinRoom
 * - api.rooms.state.getRoomState
 * - api.rooms.state.getPublicRooms
 * - api.rooms.players.leaveRoom
 * - api.rooms.players.kickPlayer
 * - api.rooms.settings.updateRoomSettings
 */

// Re-export all room functions
export { createRoom } from "./create";
export { joinRoom } from "./join";
export { getRoomState, getPublicRooms } from "./state";
export { leaveRoom, kickPlayer } from "./players";
export { updateRoomSettings } from "./settings";

// Re-export helpers for internal use
export { generateRoomCode } from "./helpers";
