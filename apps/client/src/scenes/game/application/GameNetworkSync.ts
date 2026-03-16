/**
 * GameNetworkSync
 * ソケットイベントとゲーム内状態更新の同期を担う
 * プレイヤー生成更新削除とマップ更新購読を管理する
 */
import { Container } from "pixi.js";
import type {
  BombPlacedAckPayload,
  BombPlacedPayload,
  HurricaneHitPayload,
  PongPayload,
  PlayerHitPayload,
} from "@repo/shared";
import { AppearanceResolver } from "./AppearanceResolver";
import { GameMapController } from "@client/scenes/game/entities/map/GameMapController";
import { PlayerRepository } from "@client/scenes/game/entities/player/PlayerRepository";
import { GameNetworkEventReceiver } from "./network/receivers/GameNetworkEventReceiver";
import { GameNetworkStateApplier } from "./network/handlers/GameNetworkStateApplier";
import type { WorldViewport } from "@client/scenes/game/application/culling/worldViewport";

const ENABLE_DEBUG_LOG = import.meta.env.DEV;

type GameNetworkSyncOptions = {
  worldContainer: Container;
  playerRepository: PlayerRepository;
  myId: string;
  gameMap: GameMapController;
  appearanceResolver: AppearanceResolver;
  onGameStarted: (startTime: number) => void;
  onGameEnded: () => void;
  onRemoteBombPlaced: (payload: BombPlacedPayload) => void;
  onBombPlacementAcknowledged: (payload: BombPlacedAckPayload) => void;
  onRemotePlayerHit: (payload: PlayerHitPayload) => void;
  onRemoteHurricaneHit: (payload: HurricaneHitPayload) => void;
  onPongReceived: (payload: PongPayload) => void;
  onGameStartClockHint: (serverNowMs: number) => void;
};

/** ゲーム中のネットワークイベント購読と同期処理を管理する */
export class GameNetworkSync {
  private readonly eventReceiver: GameNetworkEventReceiver;
  private readonly stateApplier: GameNetworkStateApplier;

  private debugLog = (message: string) => {
    if (!ENABLE_DEBUG_LOG) {
      return;
    }

    console.log(message);
  };

  constructor({
    worldContainer,
    playerRepository,
    myId,
    gameMap,
    appearanceResolver,
    onGameStarted,
    onGameEnded,
    onRemoteBombPlaced,
    onBombPlacementAcknowledged,
    onRemotePlayerHit,
    onRemoteHurricaneHit,
    onPongReceived,
    onGameStartClockHint,
  }: GameNetworkSyncOptions) {
    this.stateApplier = new GameNetworkStateApplier({
      worldContainer,
      playerRepository,
      myId,
      gameMap,
      appearanceResolver,
      onGameStarted,
      onGameEnded,
      onRemoteBombPlaced,
      onBombPlacementAcknowledged,
      onRemotePlayerHit,
      onRemoteHurricaneHit,
      onPongReceived,
      onGameStartClockHint,
      onDebugLog: this.debugLog,
    });

    this.eventReceiver = new GameNetworkEventReceiver(
      this.stateApplier.getReceivedEventHandlers(),
    );
  }

  public bind() {
    this.eventReceiver.bind();
  }

  public unbind() {
    this.eventReceiver.unbind();
    this.stateApplier.dispose();
  }

  /** 可視矩形に基づいて画面外描画を抑制する */
  public applyViewportCulling(viewport: WorldViewport, marginPx: number): void {
    this.stateApplier.applyViewportCulling(viewport, marginPx);
  }
}
