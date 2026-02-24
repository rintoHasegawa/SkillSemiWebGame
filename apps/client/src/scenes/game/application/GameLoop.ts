import { Application, Container, Ticker } from "pixi.js";
import { config } from "@repo/shared";
import { socketManager } from "@client/network/SocketManager";
import { LocalPlayerController, RemotePlayerController } from "../entities/player/PlayerController";
import type { GamePlayers } from "./game.types";

type GameLoopOptions = {
  app: Application;
  worldContainer: Container;
  players: GamePlayers;
  myId: string;
  getJoystickInput: () => { x: number; y: number };
};

export class GameLoop {
  private app: Application;
  private worldContainer: Container;
  private players: GamePlayers;
  private myId: string;
  private getJoystickInput: () => { x: number; y: number };
  private lastPositionSentTime = 0;
  private wasMoving = false;

  constructor({ app, worldContainer, players, myId, getJoystickInput }: GameLoopOptions) {
    this.app = app;
    this.worldContainer = worldContainer;
    this.players = players;
    this.myId = myId;
    this.getJoystickInput = getJoystickInput;
  }

  public tick = (ticker: Ticker) => {
    const me = this.players[this.myId];
    if (!me || !(me instanceof LocalPlayerController)) return;

    const deltaSeconds = ticker.deltaMS / 1000;

    const { x: dx, y: dy } = this.getJoystickInput();
    const isMoving = dx !== 0 || dy !== 0;

    if (isMoving) {
      me.applyLocalInput({ axisX: dx, axisY: dy, deltaTime: deltaSeconds });
      me.tick();

      const now = performance.now();
      if (now - this.lastPositionSentTime >= config.GAME_CONFIG.PLAYER_POSITION_UPDATE_MS) {
        const position = me.getPosition();
        socketManager.game.sendMove(position.x, position.y);
        this.lastPositionSentTime = now;
      }
    } else if (this.wasMoving) {
      me.tick();
      const position = me.getPosition();
      socketManager.game.sendMove(position.x, position.y);
    } else {
      me.tick();
    }
    this.wasMoving = isMoving;

    Object.values(this.players).forEach((player) => {
      if (player instanceof RemotePlayerController) {
        player.tick(deltaSeconds);
      }
    });

    const meDisplay = me.getDisplayObject();
    this.worldContainer.position.set(-(meDisplay.x - this.app.screen.width / 2), -(meDisplay.y - this.app.screen.height / 2));
  };
}
