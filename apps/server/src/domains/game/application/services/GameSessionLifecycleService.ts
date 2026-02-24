/**
 * GameSessionLifecycleService
 * ゲームセッションの開始，参照，終了時クリーンアップを管理する
 */
import { config } from "@repo/shared";
import { type TickData } from "../../loop/GameLoop";
import { logEvent } from "@server/logging/logEvent";
import { GameRoomSession } from "./GameRoomSession";

type SessionStore = Map<string, GameRoomSession>;
type PlayerRoomIndex = Map<string, string>;

/** ゲームセッションのライフサイクル操作を提供するサービス */
export class GameSessionLifecycleService {
  constructor(
    private sessions: SessionStore,
    private playerToRoom: PlayerRoomIndex
  ) {}

  public getRoomStartTime(roomId: string): number | undefined {
    return this.sessions.get(roomId)?.getStartTime();
  }

  public getRoomPlayers(roomId: string) {
    return this.sessions.get(roomId)?.getPlayers() ?? [];
  }

  public startRoomSession(
    roomId: string,
    playerIds: string[],
    onTick: (data: TickData) => void,
    onGameEnd: () => void
  ) {
    if (this.sessions.has(roomId)) {
      logEvent("GameSessionService", {
        event: "START_GAME_LOOP",
        result: "ignored_already_running",
        roomId,
      });
      return;
    }

    const tickRate = config.GAME_CONFIG.PLAYER_POSITION_UPDATE_MS;
    const session = new GameRoomSession(roomId, playerIds);

    playerIds.forEach((playerId) => {
      this.playerToRoom.set(playerId, roomId);
    });

    this.sessions.set(roomId, session);
    session.start(tickRate, onTick, () => {
      this.clearRoomPlayerIndex(roomId);
      this.sessions.delete(roomId);
      onGameEnd();
    });

    logEvent("GameSessionService", {
      event: "START_GAME_LOOP",
      result: "started",
      roomId,
      playerCount: playerIds.length,
    });
  }

  private clearRoomPlayerIndex(roomId: string): void {
    Array.from(this.playerToRoom.entries()).forEach(([playerId, mappedRoomId]) => {
      if (mappedRoomId === roomId) {
        this.playerToRoom.delete(playerId);
      }
    });
  }
}