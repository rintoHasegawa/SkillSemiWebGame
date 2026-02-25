/**
 * GameManager
 * ゲームセッション集合の生成，更新，参照管理を統括する
 */
import type { gameTypes, GameResultPayload } from "@repo/shared";
import { Player } from "./entities/player/Player.js";
import { GameRoomSession } from "./application/services/GameRoomSession";
import { GameSessionLifecycleService } from "./application/services/GameSessionLifecycleService";
import { GamePlayerOperationService } from "./application/services/GamePlayerOperationService";

// プレイヤー集合の生成・更新・参照管理クラス
/** ゲームセッションのライフサイクルとプレイヤー操作を統括するマネージャ */
export class GameManager {
  private sessions: Map<string, GameRoomSession>;
  private playerToRoom: Map<string, string>;
  private roomToPlayers: Map<string, Set<string>>;
  private lifecycleService: GameSessionLifecycleService;
  private playerOperationService: GamePlayerOperationService;

  constructor() {
    this.sessions = new Map();
    this.playerToRoom = new Map();
    this.roomToPlayers = new Map();
    this.lifecycleService = new GameSessionLifecycleService(this.sessions, this.playerToRoom, this.roomToPlayers);
    this.playerOperationService = new GamePlayerOperationService(this.sessions, this.playerToRoom, this.roomToPlayers);
  }

  // 外部（GameHandlerなど）から開始時刻を取得できるようにする
  getRoomStartTime(roomId: string): number | undefined {
    return this.lifecycleService.getRoomStartTime(roomId);
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
   * @param roomId ルームID
   * @param playerIds このルームに参加しているプレイヤーのIDリスト
   * @param onTick 毎フレーム実行される送信用のコールバック関数
   */
  startRoomSession(
    roomId: string, 
    playerIds: string[], 
    onTick: (data: gameTypes.TickData) => void,
    onGameEnd: (payload: GameResultPayload) => void
  ) {
    this.lifecycleService.startRoomSession(roomId, playerIds, onTick, onGameEnd);
  }

  // 指定ルームのプレイヤーを取得
  getRoomPlayers(roomId: string): Player[] {
    return this.lifecycleService.getRoomPlayers(roomId);
  }

  // 爆弾設置イベントを配信すべきか判定し，配信時は重複排除状態を更新する
  shouldBroadcastBombPlaced(roomId: string, dedupeKey: string, nowMs: number): boolean {
    return this.lifecycleService.shouldBroadcastBombPlaced(roomId, dedupeKey, nowMs);
  }

  // ルーム単位の連番からサーバー採番の爆弾IDを生成する
  issueServerBombId(roomId: string): string {
    return this.lifecycleService.issueServerBombId(roomId);
  }
}