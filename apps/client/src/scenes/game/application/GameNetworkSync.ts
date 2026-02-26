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
import { socketManager } from "@client/network/SocketManager";
import { AppearanceResolver } from "./AppearanceResolver";
import { LocalPlayerController, RemotePlayerController } from "@client/scenes/game/entities/player/PlayerController";
import { GameMapController } from "@client/scenes/game/entities/map/GameMapController";
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

type SocketSubscription = {
  bind: () => void;
  unbind: () => void;
};

type SubscriptionHandlers = {
  handleCurrentPlayers: (serverPlayers: CurrentPlayersPayload) => void;
  handleNewPlayer: (player: NewPlayerPayload) => void;
  handleGameStart: (data: GameStartPayload) => void;
  handlePlayerUpdates: (players: UpdatePlayersPayload) => void;
  handleRemovePlayer: (id: RemovePlayerPayload) => void;
  handleUpdateMapCells: (updates: UpdateMapCellsPayload) => void;
  handleGameEnd: () => void;
  handleBombPlaced: (payload: BombPlacedPayload) => void;
  handleBombPlacedAck: (payload: BombPlacedAckPayload) => void;
  handlePlayerDead: (payload: PlayerDeadPayload) => void;
};

const createSocketSubscriptions = ({
  handleCurrentPlayers,
  handleNewPlayer,
  handleGameStart,
  handlePlayerUpdates,
  handleRemovePlayer,
  handleUpdateMapCells,
  handleGameEnd,
  handleBombPlaced,
  handleBombPlacedAck,
  handlePlayerDead,
}: SubscriptionHandlers): SocketSubscription[] => {
  return [
    {
      bind: () => socketManager.game.onCurrentPlayers(handleCurrentPlayers),
      unbind: () => socketManager.game.offCurrentPlayers(handleCurrentPlayers),
    },
    {
      bind: () => socketManager.game.onNewPlayer(handleNewPlayer),
      unbind: () => socketManager.game.offNewPlayer(handleNewPlayer),
    },
    {
      bind: () => socketManager.game.onGameStart(handleGameStart),
      unbind: () => socketManager.game.offGameStart(handleGameStart),
    },
    {
      bind: () => socketManager.game.onUpdatePlayers(handlePlayerUpdates),
      unbind: () => socketManager.game.offUpdatePlayers(handlePlayerUpdates),
    },
    {
      bind: () => socketManager.game.onRemovePlayer(handleRemovePlayer),
      unbind: () => socketManager.game.offRemovePlayer(handleRemovePlayer),
    },
    {
      bind: () => socketManager.game.onUpdateMapCells(handleUpdateMapCells),
      unbind: () => socketManager.game.offUpdateMapCells(handleUpdateMapCells),
    },
    {
      bind: () => socketManager.game.onGameEnd(handleGameEnd),
      unbind: () => socketManager.game.offGameEnd(handleGameEnd),
    },
    {
      bind: () => socketManager.game.onBombPlaced(handleBombPlaced),
      unbind: () => socketManager.game.offBombPlaced(handleBombPlaced),
    },
    {
      bind: () => socketManager.game.onBombPlacedAck(handleBombPlacedAck),
      unbind: () => socketManager.game.offBombPlacedAck(handleBombPlacedAck),
    },
    {
      bind: () => socketManager.game.onPlayerDead(handlePlayerDead),
      unbind: () => socketManager.game.offPlayerDead(handlePlayerDead),
    },
  ];
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
  private socketSubscriptions: SocketSubscription[];
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
    this.socketSubscriptions = createSocketSubscriptions({
      handleCurrentPlayers: this.handleCurrentPlayers,
      handleNewPlayer: this.handleNewPlayer,
      handleGameStart: this.handleGameStart,
      handlePlayerUpdates: this.handlePlayerUpdates,
      handleRemovePlayer: this.handleRemovePlayer,
      handleUpdateMapCells: this.handleUpdateMapCells,
      handleGameEnd: this.handleGameEnd,
      handleBombPlaced: this.handleBombPlaced,
      handleBombPlacedAck: this.handleBombPlacedAck,
      handlePlayerDead: this.handlePlayerDead,
    });
  }

  public bind() {
    if (this.isBound) return;

    this.socketSubscriptions.forEach((subscription) => {
      subscription.bind();
    });

    this.isBound = true;
  }

  public unbind() {
    if (!this.isBound) return;

    this.socketSubscriptions.forEach((subscription) => {
      subscription.unbind();
    });

    this.isBound = false;
  }
}
