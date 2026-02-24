/**
 * RoomQueryService
 * ルーム状態の参照系クエリを提供するサービス
 */
import type { roomTypes } from "@repo/shared";

/** ルームの参照クエリを提供するサービス */
export class RoomQueryService {
  constructor(private rooms: Map<string, roomTypes.Room>) {}

  public getRoomById(roomId: string): roomTypes.Room | undefined {
    return this.rooms.get(roomId);
  }

  public getRoomByPlayerId(playerId: string): roomTypes.Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.some((player) => player.id === playerId)) {
        return room;
      }
    }

    return undefined;
  }

  public getRoomByOwnerId(ownerId: string): roomTypes.Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.ownerId === ownerId) {
        return room;
      }
    }

    return undefined;
  }
}
