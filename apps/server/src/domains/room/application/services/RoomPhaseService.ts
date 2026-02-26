/**
 * RoomPhaseService
 * ルーム状態のフェーズ更新処理を提供する
 */
import { roomConsts } from "@repo/shared";
import type { roomTypes } from "@repo/shared";

/** ルーム状態のフェーズ遷移を管理するサービス */
export class RoomPhaseService {
  constructor(private rooms: Map<string, roomTypes.Room>) {}

  public markRoomPlaying(roomId: string): roomTypes.Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) {
      return undefined;
    }

    room.status = roomConsts.RoomPhase.PLAYING;
    return room;
  }

  public markRoomWaiting(roomId: string): roomTypes.Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) {
      return undefined;
    }

    room.status = roomConsts.RoomPhase.WAITING;
    return room;
  }
}
