import type { roomTypes } from "@repo/shared";

export class RoomQueryService {
  constructor(private rooms: Map<string, roomTypes.Room>) {}

  public getRoomByOwnerId(ownerId: string): roomTypes.Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.ownerId === ownerId) {
        return room;
      }
    }

    return undefined;
  }
}
