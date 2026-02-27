/**
 * GameSessionLifecycleService
 * ゲームセッションの開始，参照，終了時クリーンアップを管理する
 */
import { config } from "@server/config";
import type {
  domain,
  GameResultPayload,
  PlaceBombPayload,
} from "@repo/shared";
import { logEvent } from "@server/logging/logger";
import {
  gameDomainLogEvents,
  logResults,
  logScopes,
} from "@server/logging/index";
import { GameRoomSession } from "./GameRoomSession";

type GameSessionRef = { current: GameRoomSession | null };
type ActivePlayerIndex = Set<string>;

/** ゲームセッションのライフサイクル操作を提供するサービス */
export class GameSessionLifecycleService {
  constructor(
    private sessionRef: GameSessionRef,
    private activePlayerIds: ActivePlayerIndex,
    private roomId: string,
  ) {}

  public getRoomStartTime(): number | undefined {
    return this.sessionRef.current?.getStartTime();
  }

  public getRoomPlayers() {
    return this.sessionRef.current?.getPlayers() ?? [];
  }

  public shouldBroadcastBombPlaced(dedupeKey: string, nowMs: number): boolean {
    return (
      this.sessionRef.current?.shouldBroadcastBombPlaced(dedupeKey, nowMs) ??
      false
    );
  }

  public shouldBroadcastBombHitReport(
    dedupeKey: string,
    nowMs: number,
  ): boolean {
    return (
      this.sessionRef.current?.shouldBroadcastBombHitReport(dedupeKey, nowMs) ??
      false
    );
  }

  public issueServerBombId(): string {
    const session = this.sessionRef.current;
    if (!session) {
      throw new Error("Game session not found");
    }

    return session.issueServerBombId();
  }

  /** 指定プレイヤーがBotなら被弾硬直を適用する */
  public applyBotHitStun(playerId: string, nowMs: number): boolean {
    const session = this.sessionRef.current;
    if (!session) {
      return false;
    }

    return session.applyBotHitStun(playerId, nowMs);
  }

  public startRoomSession(
    playerIds: string[],
    playerNamesById: Record<string, string>,
    onTick: (data: domain.game.TickData) => void,
    onGameEnd: (payload: GameResultPayload) => void,
    onBotPlaceBomb?: (ownerId: string, payload: PlaceBombPayload) => void,
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
    const session = new GameRoomSession(
      this.roomId,
      playerIds,
      playerNamesById,
    );

    this.activePlayerIds.clear();
    playerIds.forEach((playerId) => {
      this.activePlayerIds.add(playerId);
    });

    this.sessionRef.current = session;
    session.start(
      tickRate,
      onTick,
      (payload) => {
        this.activePlayerIds.clear();
        this.sessionRef.current = null;
        onGameEnd(payload);
      },
      onBotPlaceBomb,
    );

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
