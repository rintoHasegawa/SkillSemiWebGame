/**
 * GameManager
 * ゲームセッション集合の生成，更新，参照管理を統括する
 */

import { Player } from "./entities/player/Player.js";
import { GameRoomSession } from "./application/services/GameRoomSession";
import type { GameSessionCallbacks } from "./application/services/GameRoomSession";
import type { ActiveBombRegistration } from "./application/ports/gameUseCasePorts";
import type { ActiveBombSnapshot } from "./application/ports/gameUseCasePorts";
import type { GameFieldConfig } from "./application/ports/gameUseCasePorts";
import { GameSessionLifecycleService } from "./application/services/GameSessionLifecycleService";
import { GamePlayerOperationService } from "./application/services/GamePlayerOperationService";

type GameSessionRef = {
  current: GameRoomSession | null;
};

// プレイヤー集合の生成・更新・参照管理クラス
/** ゲームセッションのライフサイクルとプレイヤー操作を統括するマネージャ */
export class GameManager {
  private sessionRef: GameSessionRef;
  private activePlayerIds: Set<string>;
  private lifecycleService: GameSessionLifecycleService;
  private playerOperationService: GamePlayerOperationService;

  constructor(roomId: string) {
    this.sessionRef = { current: null };
    this.activePlayerIds = new Set();
    this.lifecycleService = new GameSessionLifecycleService(
      this.sessionRef,
      this.activePlayerIds,
      roomId,
    );
    this.playerOperationService = new GamePlayerOperationService(
      this.sessionRef,
      this.activePlayerIds,
    );
  }

  // 外部（GameHandlerなど）から開始時刻を取得できるようにする
  getRoomStartTime(): number | undefined {
    return this.lifecycleService.getRoomStartTime();
  }

  getRoomFieldConfig(): GameFieldConfig | undefined {
    return this.lifecycleService.getRoomFieldConfig();
  }

  // プレイヤー登録解除処理
  removePlayer(id: string) {
    this.playerOperationService.removePlayer(id);
  }

  // 切断プレイヤーをBot制御へ引き継ぐ
  replaceDisconnectedPlayerWithBot(id: string): boolean {
    return this.playerOperationService.replaceDisconnectedPlayerWithBot(id);
  }

  // 指定プレイヤー座標更新処理
  movePlayer(id: string, x: number, y: number) {
    this.playerOperationService.movePlayer(id, x, y);
  }

  /**
   * 20Hz固定のゲームループを開始する
   * @param playerIds このルームに参加しているプレイヤーのIDリスト
   * @param onTick 毎フレーム実行される送信用のコールバック関数
   */
  startRoomSession(
    playerIds: string[],
    playerNamesById: Record<string, string>,
    fieldConfig: GameFieldConfig,
    callbacks: GameSessionCallbacks,
    teamPreferences?: Record<string, number | null>,
  ) {
    this.lifecycleService.startRoomSession(
      playerIds,
      playerNamesById,
      fieldConfig,
      callbacks,
      teamPreferences,
    );
  }

  // 現在セッションのプレイヤーを取得
  getRoomPlayers(): Player[] {
    return this.lifecycleService.getRoomPlayers();
  }

  // 爆弾設置イベントを配信すべきか判定し，配信時は重複排除状態を更新する
  shouldBroadcastBombPlaced(dedupeKey: string, nowMs: number): boolean {
    return this.lifecycleService.shouldBroadcastBombPlaced(dedupeKey, nowMs);
  }

  // 被弾報告イベントを配信すべきか判定し，配信時は重複排除状態を更新する
  shouldBroadcastBombHitReport(dedupeKey: string, nowMs: number): boolean {
    return this.lifecycleService.shouldBroadcastBombHitReport(dedupeKey, nowMs);
  }

  // サーバー採番の爆弾IDを生成する（セッション未開始時は undefined）
  issueServerBombId(): string | undefined {
    return this.lifecycleService.issueServerBombId();
  }

  /** 指定プレイヤーのチームIDを返す */
  getPlayerTeamId(playerId: string): number {
    return this.lifecycleService.getPlayerTeamId(playerId);
  }

  /** 設置済み爆弾をアクティブレジストリに登録する */
  registerActiveBomb(registration: ActiveBombRegistration): void {
    this.lifecycleService.registerActiveBomb(registration);
  }

  /** 指定爆弾の所有者の bombHitCount を加算する */
  recordBombHitForOwner(bombId: string): void {
    this.lifecycleService.recordBombHitForOwner(bombId);
  }

  /** 現在アクティブな爆弾一覧を返す */
  getActiveBombSnapshots(): ActiveBombSnapshot[] {
    return this.lifecycleService.getActiveBombSnapshots();
  }

  dispose(): void {
    this.lifecycleService.dispose();
  }
}
