/**
 * GameNetworkSync
 * ソケットイベントとゲーム内状態更新の同期を担う
 * プレイヤー生成更新削除とマップ更新購読を管理する
 */
import { Container } from "pixi.js";
import type { playerTypes } from "@repo/shared";
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

  private handleCurrentPlayers = (serverPlayers: playerTypes.PlayerData[] | Record<string, playerTypes.PlayerData>) => {
    const playersArray = (Array.isArray(serverPlayers) ? serverPlayers : Object.values(serverPlayers)) as playerTypes.PlayerData[];
    playersArray.forEach((p) => {
      const playerController = p.id === this.myId ? new LocalPlayerController(p) : new RemotePlayerController(p);
      this.worldContainer.addChild(playerController.getDisplayObject());
      this.players[p.id] = playerController;
    });
  };

  private handleNewPlayer = (p: playerTypes.PlayerData) => {
    const playerController = new RemotePlayerController(p);
    this.worldContainer.addChild(playerController.getDisplayObject());
    this.players[p.id] = playerController;
  };

  private handleGameStart = (data: { startTime: number }) => {
    if (data && data.startTime) {
      this.onGameStart(data.startTime);
      console.log(`[GameManager] ゲーム開始時刻同期完了: ${data.startTime}`);
    }
  };

  private handleUpdatePlayer = (data: Partial<playerTypes.PlayerData> & { id: string }) => {
    if (data.id === this.myId) return;
    const target = this.players[data.id];
    if (target && target instanceof RemotePlayerController) {
      target.applyRemoteUpdate({ x: data.x, y: data.y });
    }
  };

  private handleRemovePlayer = (id: string) => {
    const target = this.players[id];
    if (target) {
      this.worldContainer.removeChild(target.getDisplayObject());
      target.destroy();
      delete this.players[id];
    }
  };

  private handleUpdateMapCells = (updates: Parameters<GameMapController["updateCells"]>[0]) => {
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
    socketManager.game.onUpdatePlayer(this.handleUpdatePlayer);
    socketManager.game.onRemovePlayer(this.handleRemovePlayer);
    socketManager.game.onUpdateMapCells(this.handleUpdateMapCells);

    this.isBound = true;
  }

  public unbind() {
    if (!this.isBound) return;

    socketManager.game.offCurrentPlayers(this.handleCurrentPlayers);
    socketManager.game.offNewPlayer(this.handleNewPlayer);
    socketManager.game.offGameStart(this.handleGameStart);
    socketManager.game.offUpdatePlayer(this.handleUpdatePlayer);
    socketManager.game.offRemovePlayer(this.handleRemovePlayer);
    socketManager.game.offUpdateMapCells(this.handleUpdateMapCells);

    this.isBound = false;
  }
}
