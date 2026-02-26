/**
 * GameNetworkSync
 * ソケットイベントとゲーム内状態更新の同期を担う
 * プレイヤー生成更新削除とマップ更新購読を管理する
 */
import { Container } from "pixi.js";
import type {
  BombPlacedAckPayload,
  BombPlacedPayload,
  CurrentPlayersPayload,
  GameStartPayload,
  NewPlayerPayload,
  PlayerDeadPayload,
  RemovePlayerPayload,
  UpdateMapCellsPayload,
  UpdatePlayersPayload,
} from "@repo/shared";
import { AppearanceResolver } from "./AppearanceResolver";
import { LocalPlayerController, RemotePlayerController } from "@client/scenes/game/entities/player/PlayerController";
import { GameMapController } from "@client/scenes/game/entities/map/GameMapController";
import {
  createNetworkSubscriptions,
  type SocketSubscriptionDictionary,
} from "./network/NetworkSubscriptions";
import type { GamePlayers } from "./game.types";

const ENABLE_DEBUG_LOG = import.meta.env.DEV;

type GameNetworkSyncOptions = {
  worldContainer: Container;
  players: GamePlayers;
  myId: string;
  gameMap: GameMapController;
  appearanceResolver: AppearanceResolver;
  onGameStart: (startTime: number) => void;
  onGameEnd: () => void;
  onBombPlacedFromOthers: (payload: BombPlacedPayload) => void;
  onBombPlacedAckFromNetwork: (payload: BombPlacedAckPayload) => void;
  onPlayerDeadFromNetwork: (payload: PlayerDeadPayload) => void;
};

/** ゲーム中のネットワークイベント購読と同期処理を管理する */
export class GameNetworkSync {
  private worldContainer: Container;
  private players: GamePlayers;
  private myId: string;
  private gameMap: GameMapController;
  private appearanceResolver: AppearanceResolver;
  private onGameStart: (startTime: number) => void;
  private onGameEnd: () => void;
  private onBombPlacedFromOthers: (payload: BombPlacedPayload) => void;
  private onBombPlacedAckFromNetwork: (payload: BombPlacedAckPayload) => void;
  private onPlayerDeadFromNetwork: (payload: PlayerDeadPayload) => void;
  private socketSubscriptions: SocketSubscriptionDictionary;
  private isBound = false;

  private debugLog = (message: string) => {
    if (!ENABLE_DEBUG_LOG) {
      return;
    }

    console.log(message);
  };

  private handleCurrentPlayers = (serverPlayers: CurrentPlayersPayload) => {
    serverPlayers.forEach((p) => {
      const playerController = p.id === this.myId
        ? new LocalPlayerController(p, this.appearanceResolver)
        : new RemotePlayerController(p, this.appearanceResolver);
      this.worldContainer.addChild(playerController.getDisplayObject());
      this.players[p.id] = playerController;
    });
  };

  private handleNewPlayer = (p: NewPlayerPayload) => {
    const playerController = new RemotePlayerController(p, this.appearanceResolver);
    this.worldContainer.addChild(playerController.getDisplayObject());
    this.players[p.id] = playerController;
  };

  private handleGameStart = (data: GameStartPayload) => {
    if (data && data.startTime) {
      this.onGameStart(data.startTime);
      this.debugLog(`[GameNetworkSync] ゲーム開始時刻同期完了: ${data.startTime}`);
    }
  };

  private handlePlayerUpdates = (changedPlayers: UpdatePlayersPayload) => {
    // UPDATE_PLAYERS は差分のみ届くため，対象IDだけ上書き更新する
    changedPlayers.forEach((playerData) => {
      const target = this.players[playerData.id];
      if (target && target instanceof RemotePlayerController) {
        target.applyRemoteUpdate({ x: playerData.x, y: playerData.y });
      }
    });
  };

  private handleRemovePlayer = (id: RemovePlayerPayload) => {
    const target = this.players[id];
    if (target) {
      this.worldContainer.removeChild(target.getDisplayObject());
      target.destroy();
      delete this.players[id];
    }
  };

  private handleUpdateMapCells = (updates: UpdateMapCellsPayload) => {
    this.gameMap.updateCells(updates);
  };

  private handleGameEnd = () => {
    this.onGameEnd();
  };

  private handleBombPlaced = (payload: BombPlacedPayload) => {
    this.onBombPlacedFromOthers(payload);
  };

  private handleBombPlacedAck = (payload: BombPlacedAckPayload) => {
    this.onBombPlacedAckFromNetwork(payload);
  };

  private handlePlayerDead = (payload: PlayerDeadPayload) => {
    this.onPlayerDeadFromNetwork(payload);
  };

  constructor({
    worldContainer,
    players,
    myId,
    gameMap,
    appearanceResolver,
    onGameStart,
    onGameEnd,
    onBombPlacedFromOthers,
    onBombPlacedAckFromNetwork,
    onPlayerDeadFromNetwork,
  }: GameNetworkSyncOptions) {
    this.worldContainer = worldContainer;
    this.players = players;
    this.myId = myId;
    this.gameMap = gameMap;
    this.appearanceResolver = appearanceResolver;
    this.onGameStart = onGameStart;
    this.onGameEnd = onGameEnd;
    this.onBombPlacedFromOthers = onBombPlacedFromOthers;
    this.onBombPlacedAckFromNetwork = onBombPlacedAckFromNetwork;
    this.onPlayerDeadFromNetwork = onPlayerDeadFromNetwork;
    this.socketSubscriptions = createNetworkSubscriptions({
      onCurrentPlayers: this.handleCurrentPlayers,
      onNewPlayer: this.handleNewPlayer,
      onGameStart: this.handleGameStart,
      onUpdatePlayers: this.handlePlayerUpdates,
      onRemovePlayer: this.handleRemovePlayer,
      onUpdateMapCells: this.handleUpdateMapCells,
      onGameEnd: this.handleGameEnd,
      onBombPlaced: this.handleBombPlaced,
      onBombPlacedAck: this.handleBombPlacedAck,
      onPlayerDead: this.handlePlayerDead,
    });
  }

  public bind() {
    if (this.isBound) return;

    Object.values(this.socketSubscriptions).forEach((subscription) => {
      subscription.bind();
    });

    this.isBound = true;
  }

  public unbind() {
    if (!this.isBound) return;

    Object.values(this.socketSubscriptions).forEach((subscription) => {
      subscription.unbind();
    });

    this.isBound = false;
  }
}
