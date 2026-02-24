import { Container } from "pixi.js";
import type { playerTypes } from "@repo/shared";
import { socketManager } from "@client/network/SocketManager";
import { LocalPlayerController, RemotePlayerController } from "../entities/player/PlayerController";
import { GameMapController } from "../entities/map/GameMapController";
import type { GamePlayers } from "./game.types";

type GameNetworkSyncOptions = {
  worldContainer: Container;
  players: GamePlayers;
  myId: string;
  gameMap: GameMapController;
  onGameStart: (startTime: number) => void;
};

export class GameNetworkSync {
  private worldContainer: Container;
  private players: GamePlayers;
  private myId: string;
  private gameMap: GameMapController;
  private onGameStart: (startTime: number) => void;

  constructor({ worldContainer, players, myId, gameMap, onGameStart }: GameNetworkSyncOptions) {
    this.worldContainer = worldContainer;
    this.players = players;
    this.myId = myId;
    this.gameMap = gameMap;
    this.onGameStart = onGameStart;
  }

  public bind() {
    socketManager.game.onCurrentPlayers((serverPlayers: playerTypes.PlayerData[] | Record<string, playerTypes.PlayerData>) => {
      const playersArray = (Array.isArray(serverPlayers) ? serverPlayers : Object.values(serverPlayers)) as playerTypes.PlayerData[];
      playersArray.forEach((p) => {
        const playerController = p.id === this.myId ? new LocalPlayerController(p) : new RemotePlayerController(p);
        this.worldContainer.addChild(playerController.getDisplayObject());
        this.players[p.id] = playerController;
      });
    });

    socketManager.game.onNewPlayer((p: playerTypes.PlayerData) => {
      const playerController = new RemotePlayerController(p);
      this.worldContainer.addChild(playerController.getDisplayObject());
      this.players[p.id] = playerController;
    });

    socketManager.game.onGameStart((data) => {
      if (data && data.startTime) {
        this.onGameStart(data.startTime);
        console.log(`[GameManager] ゲーム開始時刻同期完了: ${data.startTime}`);
      }
    });

    socketManager.game.onUpdatePlayer((data: Partial<playerTypes.PlayerData> & { id: string }) => {
      if (data.id === this.myId) return;
      const target = this.players[data.id];
      if (target && target instanceof RemotePlayerController) {
        target.applyRemoteUpdate({ x: data.x, y: data.y });
      }
    });

    socketManager.game.onRemovePlayer((id: string) => {
      const target = this.players[id];
      if (target) {
        this.worldContainer.removeChild(target.getDisplayObject());
        target.destroy();
        delete this.players[id];
      }
    });

    socketManager.game.onUpdateMapCells((updates) => {
      this.gameMap.updateCells(updates);
    });
  }

  public unbind() {
    socketManager.game.removeAllListeners();
  }
}
