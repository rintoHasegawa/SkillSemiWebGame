/**
 * RoomGameRuntimeRegistry
 * ルーム単位のゲームランタイム生成，解決，破棄を管理する
 */
import { GameManager } from "@server/domains/game/GameManager";
import type {
  CleanupGameRuntimePort,
  EnsureGameRuntimePort,
  FindGameByPlayerPort,
  FindGameByRoomPort,
  FindRoomByIdPort,
  FindRoomByPlayerPort,
} from "../ports/roomUseCasePorts";

/** ルームIDごとのゲームランタイムを管理するレジストリ */
export class RoomGameRuntimeRegistry
  implements EnsureGameRuntimePort, CleanupGameRuntimePort, FindGameByRoomPort, FindGameByPlayerPort {
  private gameManagers: Map<string, GameManager> = new Map();

  constructor(private roomResolver: FindRoomByPlayerPort & FindRoomByIdPort) {}

  public ensureGameManagerForRoom(roomId: string): void {
    if (this.gameManagers.has(roomId)) {
      return;
    }

    this.gameManagers.set(roomId, new GameManager(roomId));
  }

  public getGameManagerByRoomId(roomId: string): GameManager | undefined {
    return this.gameManagers.get(roomId);
  }

  public getGameManagerByPlayerId(playerId: string): GameManager | undefined {
    const roomId = this.roomResolver.getRoomByPlayerId(playerId)?.roomId;
    if (!roomId) {
      return undefined;
    }

    return this.gameManagers.get(roomId);
  }

  public cleanupGameManagerForRoom(roomId: string): void {
    if (this.roomResolver.getRoomById(roomId)) {
      return;
    }

    const gameManager = this.gameManagers.get(roomId);
    if (!gameManager) {
      return;
    }

    gameManager.dispose();
    this.gameManagers.delete(roomId);
  }
}
