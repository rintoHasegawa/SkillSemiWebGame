/**
 * GameNetworkSync
 * ソケットイベントとゲーム内状態更新の同期を担う
 * プレイヤー生成更新削除とマップ更新購読を管理する
 */
import { Container } from "pixi.js";
import type {
  BombPlacedAckPayload,
  BombPlacedPayload,
  PlayerHitPayload,
} from "@repo/shared";
import { AppearanceResolver } from "./AppearanceResolver";
import { GameMapController } from "@client/scenes/game/entities/map/GameMapController";
import { PlayerRepository } from "@client/scenes/game/entities/player/PlayerRepository";
import { GameNetworkEventReceiver } from "./network/receivers/GameNetworkEventReceiver";
import { GameNetworkStateApplier } from "./network/handlers/GameNetworkStateApplier";

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
  }
}
