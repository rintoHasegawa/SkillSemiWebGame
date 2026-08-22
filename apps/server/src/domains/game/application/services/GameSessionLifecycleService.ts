/**
 * GameSessionLifecycleService
 * ゲームセッションの開始，参照，終了時クリーンアップを管理する
 */
import { config } from "@server/config";
import type {
  ActiveBombSnapshot,
  ActiveBombRegistration,
  GameFieldConfig,
} from "../ports/gameUseCasePorts";
import { logEvent } from "@server/logging/logger";
import {
  gameDomainLogEvents,
  logResults,
  logScopes,
} from "@server/logging/index";
import { GameRoomSession, type GameSessionCallbacks } from "./GameRoomSession";

type GameSessionRef = { current: GameRoomSession | null };
type ActivePlayerIndex = Set<string>;

/** GameRoomSession 生成に必要な入力 */
export type GameRoomSessionFactoryParams = {
  roomId: string;
  playerIds: string[];
  playerNamesById: Record<string, string>;
  fieldConfig: GameFieldConfig;
  teamPreferences?: Record<string, number | null>;
};

/** GameRoomSession 生成を差し替えるためのファクトリ契約 */
export type GameRoomSessionFactory = (
  params: GameRoomSessionFactoryParams,
) => GameRoomSession;

/** 既定の GameRoomSession 生成処理 */
export const createGameRoomSession: GameRoomSessionFactory = (params) =>
  new GameRoomSession(
    params.roomId,
    params.playerIds,
    params.playerNamesById,
    params.fieldConfig,
    params.teamPreferences,
  );

/** ゲームセッションのライフサイクル操作を提供するサービス */
export class GameSessionLifecycleService {
  constructor(
    private sessionRef: GameSessionRef,
    private activePlayerIds: ActivePlayerIndex,
    private roomId: string,
    // セッション生成を差し替え可能にし，onGameEndラッパーを単体で検証できるようにする
    private createSession: GameRoomSessionFactory = createGameRoomSession,
  ) {}

  public getRoomStartTime(): number | undefined {
    return this.sessionRef.current?.getStartTime();
  }

  public getRoomPlayers() {
    return this.sessionRef.current?.getPlayers() ?? [];
  }

  public getRoomFieldConfig(): GameFieldConfig | undefined {
    return this.sessionRef.current?.getFieldConfig();
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

  /** 被弾報告が爆弾設置者と同チームからのものか判定する，セッション未開始時は false を返す */
  public isSameTeamBombHitReport(
    reporterPlayerId: string,
    bombId: string,
  ): boolean {
    return (
      this.sessionRef.current?.isSameTeamBombHitReport(
        reporterPlayerId,
        bombId,
      ) ?? false
    );
  }

  /** 爆弾設置要求がクールダウンを満たすか判定する，セッション未開始時は false を返す */
  public shouldAcceptBombPlacement(playerId: string, nowMs: number): boolean {
    return (
      this.sessionRef.current?.shouldAcceptBombPlacement(playerId, nowMs) ??
      false
    );
  }

  /** サーバー採番の爆弾IDを返す，セッション未開始時は undefined を返す */
  public issueServerBombId(): string | undefined {
    return this.sessionRef.current?.issueServerBombId();
  }

  /** 指定プレイヤーのチームIDを返す，未参加時は UNKNOWN_TEAM_ID を返す */
  public getPlayerTeamId(playerId: string): number {
    return this.sessionRef.current?.getPlayerTeamId(playerId) ?? -1;
  }

  /** 設置済み爆弾をアクティブレジストリに登録する */
  public registerActiveBomb(registration: ActiveBombRegistration): void {
    this.sessionRef.current?.registerActiveBomb(registration);
  }

  /** 指定爆弾の所有者の bombHitCount を加算する */
  public recordBombHitForOwner(bombId: string): void {
    this.sessionRef.current?.recordBombHitForOwner(bombId);
  }

  /** 現在アクティブな爆弾一覧を返す */
  public getActiveBombSnapshots(): ActiveBombSnapshot[] {
    return this.sessionRef.current?.getActiveBombSnapshots() ?? [];
  }

  public startRoomSession(
    playerIds: string[],
    playerNamesById: Record<string, string>,
    fieldConfig: GameFieldConfig,
    callbacks: GameSessionCallbacks,
    teamPreferences?: Record<string, number | null>,
  ) {
    if (this.sessionRef.current) {
      logEvent(logScopes.GAME_SESSION_LIFECYCLE_SERVICE, {
        event: gameDomainLogEvents.SESSION_START,
        result: logResults.IGNORED_ALREADY_RUNNING,
        roomId: this.roomId,
      });
      return;
    }

    const tickRate = config.GAME_CONFIG.NETWORK_SYNC.PLAYER_POSITION_UPDATE_MS;
    const session = this.createSession({
      roomId: this.roomId,
      playerIds,
      playerNamesById,
      fieldConfig,
      teamPreferences,
    });

    this.activePlayerIds.clear();
    playerIds.forEach((playerId) => {
      this.activePlayerIds.add(playerId);
    });

    this.sessionRef.current = session;
    session.start(tickRate, {
      ...callbacks,
      onGameEnd: (payload) => {
        this.activePlayerIds.clear();
        this.sessionRef.current = null;
        callbacks.onGameEnd(payload);
      },
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
