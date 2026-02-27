/**
 * GameManager
 * ゲームセッション集合の生成，更新，参照管理を統括する
 */
import type {
  domain,
  GameResultPayload,
  PlaceBombPayload,
} from "@repo/shared";
import { GameRoomSession } from "./application/services/GameRoomSession";
import { GameSessionLifecycleService } from "./application/services/GameSessionLifecycleService";
import { GamePlayerOperationService } from "./application/services/GamePlayerOperationService";
import { PlayerIdentityRegistry } from "./application/services/player/PlayerIdentityRegistry";

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
  private playerIdentityRegistry: PlayerIdentityRegistry;

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
    this.playerIdentityRegistry = new PlayerIdentityRegistry(roomId);
  }

  /** セッション開始前に playerId 対応表を初期化する */
  resetPlayerIdentitySession(): void {
    this.playerIdentityRegistry.reset();
  }

  /** 接続中ソケットへ内部 playerId を割り当てる */
  issuePlayerIdForSocket(socketId: string): string {
    return this.playerIdentityRegistry.issueHumanPlayerId(socketId);
  }

  /** Bot playerId を対応表へ登録する */
  registerBotPlayerId(playerId: string): void {
    this.playerIdentityRegistry.registerBotPlayerId(playerId);
  }

  /** socketId から内部 playerId を解決する */
  resolvePlayerIdFromSocketId(socketId: string): string | undefined {
    return this.playerIdentityRegistry.resolvePlayerIdFromSocketId(socketId);
  }

  private resolveInternalPlayerId(actorId: string): string {
    return this.playerIdentityRegistry.resolvePlayerIdFromSocketId(actorId) ?? actorId;
  }

  // 外部（GameHandlerなど）から開始時刻を取得できるようにする
  getRoomStartTime(): number | undefined {
    return this.lifecycleService.getRoomStartTime();
  }

  // プレイヤー登録解除処理
  removePlayer(id: string) {
    const internalPlayerId = this.resolveInternalPlayerId(id);
    this.playerOperationService.removePlayer(internalPlayerId);
  }

  // 切断プレイヤーをBot制御へ引き継ぐ
  replaceDisconnectedPlayerWithBot(id: string): boolean {
    const internalPlayerId = this.resolveInternalPlayerId(id);
    const replaced = this.playerOperationService.replaceDisconnectedPlayerWithBot(
      internalPlayerId,
    );

    if (replaced) {
      this.playerIdentityRegistry.promoteHumanToBotBySocketId(id);
    }

    return replaced;
  }

  // 指定プレイヤー座標更新処理
  movePlayer(id: string, x: number, y: number) {
    const internalPlayerId = this.resolveInternalPlayerId(id);
    this.playerOperationService.movePlayer(internalPlayerId, x, y);
  }

  /**
   * 20Hz固定のゲームループを開始する
   * @param playerIds このルームに参加しているプレイヤーのIDリスト
   * @param onTick 毎フレーム実行される送信用のコールバック関数
   */
  startRoomSession(
    playerIds: string[],
    playerNamesById: Record<string, string>,
    onTick: (data: domain.game.TickData) => void,
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
  getRoomPlayers(): domain.player.PlayerData[] {
    const internalPlayers = this.lifecycleService.getRoomPlayers();
    return this.playerIdentityRegistry.toSessionPlayers(internalPlayers);
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

  /** 指定プレイヤーがBotなら被弾硬直を適用する */
  applyBotHitStun(playerId: string, nowMs: number): boolean {
    const internalPlayerId = this.resolveInternalPlayerId(playerId);
    return this.lifecycleService.applyBotHitStun(internalPlayerId, nowMs);
  }

  dispose(): void {
    this.lifecycleService.dispose();
    this.playerIdentityRegistry.reset();
  }
}
