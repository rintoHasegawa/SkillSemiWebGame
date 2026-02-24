import type { TickData } from "../../GameLoop";

export interface StartGamePort {
  addPlayer(id: string): void;
  startGameLoop(
    roomId: string,
    playerIds: string[],
    onTick: (data: TickData) => void,
    onGameEnd: () => void
  ): void;
  getRoomStartTime(roomId: string): number | undefined;
}

export interface ReadyForGamePort {
  getAllPlayers(): unknown[];
  getRoomStartTime(roomId: string): number | undefined;
}

export interface MovePlayerPort {
  movePlayer(id: string, x: number, y: number): void;
}

export interface DisconnectPlayerPort {
  removePlayer(id: string): void;
}
