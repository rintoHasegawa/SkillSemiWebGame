/**
 * GameManager
 * ゲームセッション集合の生成，更新，参照管理を統括する
 */
import type {
  gameTypes,
  GameResultPayload,
  PlaceBombPayload,
} from "@repo/shared";
import { Player } from "./entities/player/Player.js";
import { GameRoomSession } from "./application/services/GameRoomSession";
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

  // プレイヤー登録解除処理
  removePlayer(id: string) {
    this.playerOperationService.removePlayer(id);
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
    onTick: (data: gameTypes.TickData) => void,
    onGameEnd: (payload: GameResultPayload) => void,
    onBotPlaceBomb?: (ownerId: string, payload: PlaceBombPayload) => void,
  ) {
    this.lifecycleService.startRoomSession(
      playerIds,
      playerNamesById,
      onTick,
      onGameEnd,
      onBotPlaceBomb,
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

  // サーバー採番の爆弾IDを生成する
  issueServerBombId(): string {
    return this.lifecycleService.issueServerBombId();
  }

  dispose(): void {
    this.lifecycleService.dispose();
  }
}
