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
import type { BombHitReportOriginDecision } from "./application/ports/gameUseCasePorts";
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

  // 外部（GameHandlerなど）から符号付きゲーム経過時間を取得できるようにする
  getRoomSignedElapsedMs(): number | undefined {
    return this.lifecycleService.getRoomSignedElapsedMs();
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

  // 復帰プレイヤーのBot制御を解除して人間操作へ戻す
  demotePlayerFromBotControl(id: string): boolean {
    return this.playerOperationService.demotePlayerFromBotControl(id);
  }

  /** 現在のマップ塗り状態を読み取り専用ビューとして返す */
  getMapGridColorsView(): readonly number[] {
    return this.lifecycleService.getMapGridColorsView();
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
  shouldBroadcastBombPlaced(dedupeKey: string): boolean {
    return this.lifecycleService.shouldBroadcastBombPlaced(dedupeKey);
  }

  // 被弾報告イベントを配信すべきか判定し，配信時は重複排除状態を更新する
  shouldBroadcastBombHitReport(dedupeKey: string): boolean {
    return this.lifecycleService.shouldBroadcastBombHitReport(dedupeKey);
  }

  // 被弾報告の爆弾が実在し，受理時刻窓と距離しきい値の内側か判定する
  checkBombHitReportOrigin(
    reporterPlayerId: string,
    bombId: string,
  ): BombHitReportOriginDecision {
    return this.lifecycleService.checkBombHitReportOrigin(
      reporterPlayerId,
      bombId,
    );
  }

  // 被弾報告が爆弾設置者と同チーム（設置者本人・味方）からのものか判定する
  isSameTeamBombHitReport(reporterPlayerId: string, bombId: string): boolean {
    return this.lifecycleService.isSameTeamBombHitReport(
      reporterPlayerId,
      bombId,
    );
  }

  // 爆弾設置要求がクールダウンを満たすか判定し，受理時は直近受理時刻を更新する
  shouldAcceptBombPlacement(playerId: string): boolean {
    return this.lifecycleService.shouldAcceptBombPlacement(playerId);
  }

  // サーバー採番の爆弾IDを生成する（セッション未開始時は undefined）
  issueServerBombId(): string | undefined {
    return this.lifecycleService.issueServerBombId();
  }

  /** 爆発予定時刻をサーバー経過時間から解決する */
  resolveBombExplodeAtElapsedMs(): number {
    return this.lifecycleService.resolveBombExplodeAtElapsedMs();
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
