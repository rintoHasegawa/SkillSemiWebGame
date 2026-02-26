/**
 * GameSceneRuntime
 * ゲームシーン実行中のサブシステム管理を担当する
 * 入力状態，ネットワーク同期，ループ更新の実行責務を集約する
 */
import { Application, Container, Ticker } from "pixi.js";
import type {
  BombPlacedAckPayload,
  BombPlacedPayload,
  PlayerDeadPayload,
} from "@repo/shared";
import { AppearanceResolver } from "../AppearanceResolver";
import { GameNetworkSync } from "../GameNetworkSync";
import { GameLoop } from "../GameLoop";
import { GameSceneOrchestrator, type GameSceneFactoryOptions } from "../orchestrators/GameSceneOrchestrator";
import type { GamePlayers } from "../game.types";
import type { BombExplodedPayload, BombManager } from "../../entities/bomb/BombManager";
import type { MoveSender } from "../network/PlayerMoveSender";
import type { GameActionSender } from "../network/GameActionSender";
import type { GameSessionFacade } from "../lifecycle/GameSessionFacade";

export type GameSceneRuntimeOptions = {
  app: Application;
  worldContainer: Container;
  players: GamePlayers;
  myId: string;
  sessionFacade: GameSessionFacade;
  gameActionSender: GameActionSender;
  moveSender: MoveSender;
  getElapsedMs: () => number;
  onGameStart: (startTime: number) => void;
  onGameEnd: () => void;
  onBombPlacedFromOthers: (payload: BombPlacedPayload) => void;
  onBombPlacedAckFromNetwork: (payload: BombPlacedAckPayload) => void;
  onPlayerDeadFromNetwork: (payload: PlayerDeadPayload) => void;
  onBombExploded: (payload: BombExplodedPayload) => void;
  sceneFactories?: GameSceneFactoryOptions;
};

/** ゲームシーンの実行系サブシステムを管理する */
export class GameSceneRuntime {
  private readonly app: Application;
  private readonly worldContainer: Container;
  private readonly players: GamePlayers;
  private readonly myId: string;
  private readonly sessionFacade: GameSessionFacade;
  private readonly gameActionSender: GameActionSender;
  private readonly moveSender: MoveSender;
  private readonly getElapsedMs: () => number;
  private readonly onGameStart: (startTime: number) => void;
  private readonly onGameEnd: () => void;
  private readonly onBombPlacedFromOthers: (payload: BombPlacedPayload) => void;
  private readonly onBombPlacedAckFromNetwork: (payload: BombPlacedAckPayload) => void;
  private readonly onPlayerDeadFromNetwork: (payload: PlayerDeadPayload) => void;
  private readonly onBombExploded: (payload: BombExplodedPayload) => void;
  private readonly sceneFactories?: GameSceneFactoryOptions;

  private readonly appearanceResolver = new AppearanceResolver();
  private bombManager: BombManager | null = null;
  private networkSync: GameNetworkSync | null = null;
  private gameLoop: GameLoop | null = null;
  private joystickInput = { x: 0, y: 0 };

  constructor({
    app,
    worldContainer,
    players,
    myId,
    sessionFacade,
    gameActionSender,
    moveSender,
    getElapsedMs,
    onGameStart,
    onGameEnd,
    onBombPlacedFromOthers,
    onBombPlacedAckFromNetwork,
    onPlayerDeadFromNetwork,
    onBombExploded,
    sceneFactories,
  }: GameSceneRuntimeOptions) {
    this.app = app;
    this.worldContainer = worldContainer;
    this.players = players;
    this.myId = myId;
    this.sessionFacade = sessionFacade;
    this.gameActionSender = gameActionSender;
    this.moveSender = moveSender;
    this.getElapsedMs = getElapsedMs;
    this.onGameStart = onGameStart;
    this.onGameEnd = onGameEnd;
    this.onBombPlacedFromOthers = onBombPlacedFromOthers;
    this.onBombPlacedAckFromNetwork = onBombPlacedAckFromNetwork;
    this.onPlayerDeadFromNetwork = onPlayerDeadFromNetwork;
    this.onBombExploded = onBombExploded;
    this.sceneFactories = sceneFactories;
  }

  /** シーン実行に必要なサブシステムを初期化する */
  public initialize(): void {
    const orchestrator = new GameSceneOrchestrator({
      app: this.app,
      worldContainer: this.worldContainer,
      players: this.players,
      myId: this.myId,
      appearanceResolver: this.appearanceResolver,
      getElapsedMs: this.getElapsedMs,
      getJoystickInput: () => this.joystickInput,
      moveSender: this.moveSender,
      onGameStart: this.onGameStart,
      onGameEnd: this.onGameEnd,
      onBombPlacedFromOthers: this.onBombPlacedFromOthers,
      onBombPlacedAckFromNetwork: this.onBombPlacedAckFromNetwork,
      onPlayerDeadFromNetwork: this.onPlayerDeadFromNetwork,
      onBombExploded: this.onBombExploded,
      factories: this.sceneFactories,
    });

    const initializedScene = orchestrator.initialize();
    this.networkSync = initializedScene.networkSync;
    this.bombManager = initializedScene.bombManager;
    this.gameLoop = initializedScene.gameLoop;
  }

  public isInputEnabled(): boolean {
    return this.sessionFacade.canAcceptInput();
  }

  public setJoystickInput(x: number, y: number): void {
    this.joystickInput = this.sessionFacade.sanitizeJoystickInput({ x, y });
  }

  public clearJoystickInput(): void {
    this.joystickInput = { x: 0, y: 0 };
  }

  public placeBomb(): string | null {
    if (!this.sessionFacade.canAcceptInput()) return null;
    if (!this.bombManager) return null;
    const placed = this.bombManager.placeBomb();
    if (!placed) return null;

    this.gameActionSender.sendPlaceBomb(placed.payload);
    return placed.tempBombId;
  }

  public getBombManager(): BombManager | null {
    return this.bombManager;
  }

  public readyForGame(): void {
    this.gameActionSender.readyForGame();
  }

  public tick(ticker: Ticker): void {
    this.gameLoop?.tick(ticker);
  }

  /** 実行系サブシステムを破棄する */
  public destroy(): void {
    this.bombManager?.destroy();
    this.bombManager = null;
    this.networkSync?.unbind();
    this.networkSync = null;
    this.gameLoop = null;
    this.clearJoystickInput();
  }
}
