/**
 * GameSessionLifecycleService
 * ゲームセッションの開始，参照，終了時クリーンアップを管理する
 */
import { config } from "@server/config";
import type { gameTypes, GameResultPayload } from "@repo/shared";
import { logEvent } from "@server/logging/logger";
import { gameDomainLogEvents, logResults, logScopes } from "@server/logging/index";
import { GameRoomSession } from "./GameRoomSession";

type SessionStore = Map<string, GameRoomSession>;
type PlayerRoomIndex = Map<string, string>;
type RoomPlayersIndex = Map<string, Set<string>>;

/** ゲームセッションのライフサイクル操作を提供するサービス */
export class GameSessionLifecycleService {
  constructor(
    private sessions: SessionStore,
    private playerToRoom: PlayerRoomIndex,
    private roomToPlayers: RoomPlayersIndex
  ) {}

  public getRoomStartTime(roomId: string): number | undefined {
    return this.sessions.get(roomId)?.getStartTime();
  }

  public getRoomPlayers(roomId: string) {
    return this.sessions.get(roomId)?.getPlayers() ?? [];
  }

  public shouldBroadcastBombPlaced(roomId: string, dedupeKey: string, nowMs: number): boolean {
    return this.sessions.get(roomId)?.shouldBroadcastBombPlaced(dedupeKey, nowMs) ?? false;
  }

  public issueServerBombId(roomId: string): string {
    const session = this.sessions.get(roomId);
    if (!session) {
      throw new Error(`Game session not found for roomId: ${roomId}`);
    }

    return session.issueServerBombId();
  }

  public startRoomSession(
    roomId: string,
    playerIds: string[],
    onTick: (data: gameTypes.TickData) => void,
    onGameEnd: (payload: GameResultPayload) => void
  ) {
    if (this.sessions.has(roomId)) {
      logEvent(logScopes.GAME_SESSION_LIFECYCLE_SERVICE, {
        event: gameDomainLogEvents.SESSION_START,
        result: logResults.IGNORED_ALREADY_RUNNING,
        roomId,
      });
      return;
    }

    const tickRate = config.GAME_CONFIG.PLAYER_POSITION_UPDATE_MS;
    const session = new GameRoomSession(roomId, playerIds);
    const roomPlayerSet = new Set(playerIds);

    playerIds.forEach((playerId) => {
      this.playerToRoom.set(playerId, roomId);
    });
    this.roomToPlayers.set(roomId, roomPlayerSet);

    this.sessions.set(roomId, session);
    session.start(tickRate, onTick, (payload) => {
      this.clearRoomPlayerIndex(roomId);
      this.sessions.delete(roomId);
      onGameEnd(payload);
    });

    logEvent(logScopes.GAME_SESSION_LIFECYCLE_SERVICE, {
      event: gameDomainLogEvents.SESSION_START,
      result: logResults.STARTED,
      roomId,
      playerCount: playerIds.length,
    });
  }

  private clearRoomPlayerIndex(roomId: string): void {
    const roomPlayerSet = this.roomToPlayers.get(roomId);
    if (!roomPlayerSet) {
      return;
    }

    roomPlayerSet.forEach((playerId) => {
      this.playerToRoom.delete(playerId);
    });
    this.roomToPlayers.delete(roomId);
  }
}