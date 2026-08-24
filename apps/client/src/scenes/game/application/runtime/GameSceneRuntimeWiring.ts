/**
 * GameSceneRuntimeWiring
 * ゲームシーン実行系の初期配線を担当する
 * Orchestrator呼び出しをRuntime本体から分離する
 */
import { Application, Container } from "pixi.js";
import { AppearanceResolver } from "../AppearanceResolver";
import {
  GameSceneOrchestrator,
  type GameSceneEventPorts,
  type GameSceneFactoryOptions,
  type InitializedGameScene,
} from "../orchestrators/GameSceneOrchestrator";
import type { GamePlayers } from "../game.types";
import type { MoveSender } from "../network/PlayerMoveSender";
import type { PlayerRepository } from "@client/scenes/game/entities/player/PlayerRepository";
import type { PongPayload } from "@repo/shared";

/** Runtime配線処理の入力型 */
export type GameSceneRuntimeWiringOptions = {
  app: Application;
  worldContainer: Container;
  players: GamePlayers;
  playerRepository: PlayerRepository;
  myId: string;
  appearanceResolver: AppearanceResolver;
  getElapsedMs: () => number;
  getJoystickInput: () => { x: number; y: number };
  moveSender: MoveSender;
  eventPorts: GameSceneEventPorts;
  onPongReceived: (payload: PongPayload) => void;
  onGameStartClockHint: (serverElapsedMs: number) => void;
  sceneFactories?: GameSceneFactoryOptions;
};

/** Runtime向けの初期配線結果を返す */
export class GameSceneRuntimeWiring {
  private readonly options: GameSceneRuntimeWiringOptions;

  constructor(options: GameSceneRuntimeWiringOptions) {
    this.options = options;
  }

  /** シーン実行系サブシステムの初期配線を行う */
  public wire(): InitializedGameScene {
    const orchestrator = new GameSceneOrchestrator({
      app: this.options.app,
      worldContainer: this.options.worldContainer,
      players: this.options.players,
      playerRepository: this.options.playerRepository,
      myId: this.options.myId,
      appearanceResolver: this.options.appearanceResolver,
      getElapsedMs: this.options.getElapsedMs,
      getJoystickInput: this.options.getJoystickInput,
      moveSender: this.options.moveSender,
      eventPorts: this.options.eventPorts,
      onPongReceived: this.options.onPongReceived,
      onGameStartClockHint: this.options.onGameStartClockHint,
      factories: this.options.sceneFactories,
    });

    return orchestrator.initialize();
  }
}
