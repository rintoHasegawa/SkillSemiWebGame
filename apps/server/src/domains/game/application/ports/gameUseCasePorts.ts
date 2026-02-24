import type { TickData } from "../../loop/GameLoop";
import type { gridMapTypes, playerTypes, roomTypes } from "@repo/shared";

export interface StartGamePort {
  startRoomSession(
    roomId: string,
    playerIds: string[],
    onTick: (data: TickData) => void,
    onGameEnd: () => void
  ): void;
  getRoomStartTime(roomId: string): number | undefined;
}

export interface ReadyForGamePort {
  getRoomPlayers(roomId: string): playerTypes.PlayerData[];
  getRoomStartTime(roomId: string): number | undefined;
}

export interface MovePlayerPort {
  movePlayer(id: string, x: number, y: number): void;
}

export interface DisconnectPlayerPort {
  removePlayer(id: string): void;
}

export interface GameOutputPort {
  publishPongToSocket(payload: { clientTime: number; serverTime: number }): void;
  publishUpdatePlayerToRoom(roomId: roomTypes.Room["roomId"], playerData: playerTypes.PlayerData): void;
  publishMapCellUpdatesToRoom(
    roomId: roomTypes.Room["roomId"],
    cellUpdates: gridMapTypes.CellUpdate[]
  ): void;
  publishGameEndToRoom(roomId: roomTypes.Room["roomId"]): void;
  publishGameStartToRoom(roomId: roomTypes.Room["roomId"], payload: { startTime: number }): void;
  publishCurrentPlayersToSocket(players: playerTypes.PlayerData[]): void;
  publishGameStartToSocket(payload: { startTime: number }): void;
  publishPlayerRemovedToRoom(roomId: roomTypes.Room["roomId"], removedPlayerId: string): void;
}
