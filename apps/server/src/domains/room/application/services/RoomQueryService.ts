/**
 * RoomQueryService
 * ルーム状態の参照系クエリを提供するサービス
 */
import { domain } from "@repo/shared";

/** ルームの参照クエリを提供するサービス */
export class RoomQueryService {
  constructor(private rooms: Map<string, domain.room.Room>) {}

  public getRoomById(roomId: string): domain.room.Room | undefined {
    return this.rooms.get(roomId);
  }

  public getRoomByPlayerId(playerId: string): domain.room.Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.some((player) => player.id === playerId)) {
        return room;
      }
    }

    return undefined;
  }

  public getRoomByOwnerId(ownerId: string): domain.room.Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.ownerId === ownerId) {
        return room;
      }
    }

    return undefined;
  }
}
