/**
 * RoomPhaseService
 * ルーム状態のフェーズ更新処理を提供する
 */
import { domain } from "@repo/shared";
import type { RoomPhaseTransitionResult } from "../ports/roomUseCasePorts";

/** ルーム状態のフェーズ遷移を管理するサービス */
export class RoomPhaseService {
  constructor(private rooms: Map<string, domain.room.Room>) {}

  public markRoomPlaying(roomId: string): RoomPhaseTransitionResult {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { status: "not_found" };
    }

    if (room.status === domain.room.RoomPhase.PLAYING) {
      return {
        status: "invalid_transition",
        room,
      };
    }

    room.status = domain.room.RoomPhase.PLAYING;
    return {
      status: "updated",
      room,
    };
  }

  public markRoomResult(roomId: string): RoomPhaseTransitionResult {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { status: "not_found" };
    }

    if (room.status !== domain.room.RoomPhase.PLAYING) {
      return {
        status: "invalid_transition",
        room,
      };
    }

    room.status = domain.room.RoomPhase.RESULT;
    return {
      status: "updated",
      room,
    };
  }

  public markRoomWaiting(roomId: string): RoomPhaseTransitionResult {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { status: "not_found" };
    }

    if (room.status === domain.room.RoomPhase.WAITING) {
      return {
        status: "invalid_transition",
        room,
      };
    }

    room.status = domain.room.RoomPhase.WAITING;
    return {
      status: "updated",
      room,
    };
  }
}
