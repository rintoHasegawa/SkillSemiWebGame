/**
 * GameNetworkSync
 * ソケットイベントとゲーム内状態更新の同期を担う
 * プレイヤー生成更新削除とマップ更新購読を管理する
 */
import { Container } from "pixi.js";
import type {
  CurrentPlayersPayload,
  GameStartPayload,
  NewPlayerPayload,
  RemovePlayerPayload,
  UpdateMapCellsPayload,
  UpdatePlayersPayload,
} from "@repo/shared";
import { socketManager } from "@client/network/SocketManager";
import { LocalPlayerController, RemotePlayerController } from "@client/scenes/game/entities/player/PlayerController";
import { GameMapController } from "@client/scenes/game/entities/map/GameMapController";
import type { GamePlayers } from "./game.types";

type GameNetworkSyncOptions = {
  worldContainer: Container;
  players: GamePlayers;
  myId: string;
  gameMap: GameMapController;
  onGameStart: (startTime: number) => void;
};

/** ゲーム中のネットワークイベント購読と同期処理を管理する */
export class GameNetworkSync {
  private worldContainer: Container;
  private players: GamePlayers;
  private myId: string;
  private gameMap: GameMapController;
  private onGameStart: (startTime: number) => void;
  private isBound = false;

  private handleCurrentPlayers = (serverPlayers: CurrentPlayersPayload) => {
    serverPlayers.forEach((p) => {
      const playerController = p.id === this.myId ? new LocalPlayerController(p) : new RemotePlayerController(p);
      this.worldContainer.addChild(playerController.getDisplayObject());
      this.players[p.id] = playerController;
    });
  };

  private handleNewPlayer = (p: NewPlayerPayload) => {
    const playerController = new RemotePlayerController(p);
    this.worldContainer.addChild(playerController.getDisplayObject());
    this.players[p.id] = playerController;
  };

  private handleGameStart = (data: GameStartPayload) => {
    if (data && data.startTime) {
      this.onGameStart(data.startTime);
      console.log(`[GameManager] ゲーム開始時刻同期完了: ${data.startTime}`);
    }
  };

  private handlePlayerUpdates = (changedPlayers: UpdatePlayersPayload) => {
    // UPDATE_PLAYERS は差分のみ届くため，対象IDだけ上書き更新する
    changedPlayers.forEach((playerData) => {
      if (playerData.id === this.myId) return;

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

  constructor({ worldContainer, players, myId, gameMap, onGameStart }: GameNetworkSyncOptions) {
    this.worldContainer = worldContainer;
    this.players = players;
    this.myId = myId;
    this.gameMap = gameMap;
    this.onGameStart = onGameStart;
  }

  public bind() {
    if (this.isBound) return;

    socketManager.game.onCurrentPlayers(this.handleCurrentPlayers);
    socketManager.game.onNewPlayer(this.handleNewPlayer);
    socketManager.game.onGameStart(this.handleGameStart);
    socketManager.game.onUpdatePlayers(this.handlePlayerUpdates);
    socketManager.game.onRemovePlayer(this.handleRemovePlayer);
    socketManager.game.onUpdateMapCells(this.handleUpdateMapCells);

    this.isBound = true;
  }

  public unbind() {
    if (!this.isBound) return;

    socketManager.game.offCurrentPlayers(this.handleCurrentPlayers);
    socketManager.game.offNewPlayer(this.handleNewPlayer);
    socketManager.game.offGameStart(this.handleGameStart);
    socketManager.game.offUpdatePlayers(this.handlePlayerUpdates);
    socketManager.game.offRemovePlayer(this.handleRemovePlayer);
    socketManager.game.offUpdateMapCells(this.handleUpdateMapCells);

    this.isBound = false;
  }
}
