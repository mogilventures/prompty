/**
 * Room helper functions
 */
import { ROOM_CODE_LENGTH, ROOM_CODE_CHARS } from "../lib/constants";

/**
 * Generate a unique room code
 */
export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}
