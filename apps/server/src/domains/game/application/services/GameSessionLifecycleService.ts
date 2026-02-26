/**
 * GameSessionLifecycleService
 * ゲームセッションの開始，参照，終了時クリーンアップを管理する
 */
import { config } from "@server/config";
import type { gameTypes, GameResultPayload } from "@repo/shared";
import { logEvent } from "@server/logging/logger";
import { gameDomainLogEvents, logResults, logScopes } from "@server/logging/index";
import { GameRoomSession } from "./GameRoomSession";

type GameSessionRef = { current: GameRoomSession | null };
type ActivePlayerIndex = Set<string>;

/** ゲームセッションのライフサイクル操作を提供するサービス */
export class GameSessionLifecycleService {
  constructor(
    private sessionRef: GameSessionRef,
    private activePlayerIds: ActivePlayerIndex,
    private roomId: string
  ) {}

  public getRoomStartTime(): number | undefined {
    return this.sessionRef.current?.getStartTime();
  }

  public getRoomPlayers() {
    return this.sessionRef.current?.getPlayers() ?? [];
  }

  public shouldBroadcastBombPlaced(dedupeKey: string, nowMs: number): boolean {
    return this.sessionRef.current?.shouldBroadcastBombPlaced(dedupeKey, nowMs) ?? false;
  }

  public issueServerBombId(): string {
    const session = this.sessionRef.current;
    if (!session) {
      throw new Error("Game session not found");
    }

    return session.issueServerBombId();
  }

  public startRoomSession(
    playerIds: string[],
    onTick: (data: gameTypes.TickData) => void,
    onGameEnd: (payload: GameResultPayload) => void
  ) {
    if (this.sessionRef.current) {
      logEvent(logScopes.GAME_SESSION_LIFECYCLE_SERVICE, {
        event: gameDomainLogEvents.SESSION_START,
        result: logResults.IGNORED_ALREADY_RUNNING,
        roomId: this.roomId,
      });
      return;
    }

    const tickRate = config.GAME_CONFIG.PLAYER_POSITION_UPDATE_MS;
    const session = new GameRoomSession(this.roomId, playerIds);

    this.activePlayerIds.clear();
    playerIds.forEach((playerId) => {
      this.activePlayerIds.add(playerId);
    });

    this.sessionRef.current = session;
    session.start(tickRate, onTick, (payload) => {
      this.activePlayerIds.clear();
      this.sessionRef.current = null;
      onGameEnd(payload);
    });

    logEvent(logScopes.GAME_SESSION_LIFECYCLE_SERVICE, {
      event: gameDomainLogEvents.SESSION_START,
      result: logResults.STARTED,
      roomId: this.roomId,
      playerCount: playerIds.length,
    });
  }

  public dispose(): void {
    this.sessionRef.current?.dispose();
    this.sessionRef.current = null;
    this.activePlayerIds.clear();
  }
}