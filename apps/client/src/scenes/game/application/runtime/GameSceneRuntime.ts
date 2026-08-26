/**
 * GameSceneRuntime
 * ゲームシーン実行中のサブシステム管理を担当する
 * 入力状態，ネットワーク同期，ループ更新の実行責務を集約する
 */
import { Application, Container, Ticker } from "pixi.js";
import { AppearanceResolver } from "../AppearanceResolver";
import { GameNetworkSync } from "../GameNetworkSync";
import { GameLoop } from "../GameLoop";
import {
  type GameSceneEventPorts,
  type GameSceneFactoryOptions,
} from "../orchestrators/GameSceneOrchestrator";
import type { GamePlayers } from "../game.types";
import type { BombManager } from "../../entities/bomb/BombManager";
import type { MoveSender } from "../network/PlayerMoveSender";
import type { GameActionSender } from "../network/GameActionSender";
import type { GameSessionFacade } from "../lifecycle/GameSessionFacade";
import { DisposableRegistry } from "../lifecycle/DisposableRegistry";
import { GameSceneRuntimeWiring } from "./GameSceneRuntimeWiring";
import { PlayerRepository } from "@client/scenes/game/entities/player/PlayerRepository";
import type { GameMapController } from "@client/scenes/game/entities/map/GameMapController";
import { config } from "@client/config";
import type { PongPayload } from "@repo/shared";
import {
  expandWorldViewport,
  resolveWorldViewport,
} from "@client/scenes/game/application/culling/worldViewport";

type RuntimeLifecycleState = "created" | "initialized" | "destroyed";

export type GameSceneRuntimeOptions = {
  app: Application;
  worldContainer: Container;
  players: GamePlayers;
  myId: string;
  sessionFacade: GameSessionFacade;
  gameActionSender: GameActionSender;
  moveSender: MoveSender;
  getElapsedMs: () => number;
  eventPorts: GameSceneEventPorts;
  onPongReceived: (payload: PongPayload) => void;
  onGameStartClockHint: (serverElapsedMs: number) => void;
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
  private readonly eventPorts: GameSceneEventPorts;
  private readonly onPongReceived: (payload: PongPayload) => void;
  private readonly onGameStartClockHint: (serverElapsedMs: number) => void;
  private readonly sceneFactories?: GameSceneFactoryOptions;
  private readonly playerRepository: PlayerRepository;
  private readonly disposableRegistry = new DisposableRegistry();

  private readonly appearanceResolver = new AppearanceResolver();
  private bombManager: BombManager | null = null;
  private gameMap: GameMapController | null = null;
  private networkSync: GameNetworkSync | null = null;
  private gameLoop: GameLoop | null = null;
  private joystickInput = { x: 0, y: 0 };
  private tickerHandler: ((ticker: Ticker) => void) | null = null;
  private lifecycleState: RuntimeLifecycleState = "created";
  private miniMapCache = {
    revision: -1,
    teamIds: new Array<number>(
      config.GAME_CONFIG.GRID_COLS * config.GAME_CONFIG.GRID_ROWS,
    ).fill(-1),
  };

  constructor({
    app,
    worldContainer,
    players,
    myId,
    sessionFacade,
    gameActionSender,
    moveSender,
    getElapsedMs,
    eventPorts,
    onPongReceived,
    onGameStartClockHint,
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
    this.eventPorts = eventPorts;
    this.onPongReceived = onPongReceived;
    this.onGameStartClockHint = onGameStartClockHint;
    this.sceneFactories = sceneFactories;
    this.playerRepository = new PlayerRepository(this.players);

    this.disposableRegistry.add(() => {
      this.clearJoystickInput();
    });
    this.disposableRegistry.add(() => {
      this.gameLoop = null;
    });
  }

  /** シーン実行に必要なサブシステムを初期化する */
  public initialize(): void {
    if (this.lifecycleState !== "created") {
      return;
    }

    const runtimeWiring = new GameSceneRuntimeWiring({
      app: this.app,
      worldContainer: this.worldContainer,
      players: this.players,
      playerRepository: this.playerRepository,
      myId: this.myId,
      appearanceResolver: this.appearanceResolver,
      getElapsedMs: this.getElapsedMs,
      getJoystickInput: () => this.joystickInput,
      canApplyInput: () => this.sessionFacade.canApplyInput(),
      moveSender: this.moveSender,
      eventPorts: this.eventPorts,
      onPongReceived: this.onPongReceived,
      onGameStartClockHint: this.onGameStartClockHint,
      sceneFactories: this.sceneFactories,
    });

    const initializedScene = runtimeWiring.wire();
    this.gameMap = initializedScene.gameMap;
    this.networkSync = initializedScene.networkSync;
    this.bombManager = initializedScene.bombManager;
    this.gameLoop = initializedScene.gameLoop;
    this.lifecycleState = "initialized";

    this.disposableRegistry.add(() => {
      this.gameMap?.destroy();
      this.gameMap = null;
    });
    this.disposableRegistry.add(() => {
      this.networkSync?.unbind();
      this.networkSync = null;
    });
    this.disposableRegistry.add(() => {
      this.bombManager?.destroy();
      this.bombManager = null;
    });
  }

  /** シーン実行を開始する */
  public activate(tick: (ticker: Ticker) => void): void {
    if (this.lifecycleState !== "created") {
      return;
    }

    this.initialize();
    this.readyForGame();
    this.app.ticker.add(tick);
    this.tickerHandler = tick;
  }

  /** ジョイスティックUIの操作を受け付けてよいかを返す（開始前も true） */
  public isInputEnabled(): boolean {
    return this.sessionFacade.canAcceptInput();
  }

  /** 爆弾設置を受け付けてよいかを返す（開始前は false） */
  public isBombEnabled(): boolean {
    return this.sessionFacade.canApplyInput();
  }

  /** 生の入力をそのまま保持し，移動への反映可否はループ側で判定する */
  public setJoystickInput(x: number, y: number): void {
    this.joystickInput = { x, y };
  }

  public clearJoystickInput(): void {
    this.joystickInput = { x: 0, y: 0 };
  }

  public placeBomb(): string | null {
    if (!this.sessionFacade.canApplyInput()) return null;
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
    // 入力ロック中や残り時間切れでは保持中の入力を破棄する
    // 開始前カウントダウン中は保持し，開始と同時にその方向へ動き出せるようにする
    if (!this.sessionFacade.canAcceptInput()) {
      this.clearJoystickInput();
    }

    this.gameLoop?.tick(ticker);
    this.applyViewportCulling();
  }

  /** チームごとの塗り率配列を返す */
  public getPaintRatesByTeam(): number[] {
    if (!this.gameMap) {
      return new Array<number>(config.GAME_CONFIG.TEAM_COUNT).fill(0);
    }

    return this.gameMap.getPaintRatesByTeam();
  }

  /** ミニマップ描画用の全セルteamId配列を返す */
  public getMiniMapTeamIds(): number[] {
    if (!this.gameMap) {
      return this.miniMapCache.teamIds;
    }

    const revision = this.gameMap.getMapRevision();
    if (revision !== this.miniMapCache.revision) {
      this.miniMapCache = {
        revision,
        teamIds: this.gameMap.getAllCellTeamIds(),
      };
    }

    return this.miniMapCache.teamIds;
  }

  /** ミニマップ描画用のマップ更新リビジョンを返す */
  public getMiniMapRevision(): number {
    return this.miniMapCache.revision;
  }

  /** ローカルプレイヤーの現在座標を返す */
  public getLocalPlayerPosition(): { x: number; y: number } | null {
    const localPlayer = this.playerRepository.getById(this.myId);
    if (!localPlayer) {
      return null;
    }

    const position = localPlayer.getPosition();
    return {
      x: position.x,
      y: position.y,
    };
  }

  /** 実行系サブシステムを破棄する */
  public destroy(): void {
    if (this.lifecycleState === "destroyed") {
      return;
    }

    this.lifecycleState = "destroyed";
    if (this.tickerHandler) {
      this.app.ticker?.remove(this.tickerHandler);
      this.tickerHandler = null;
    }
    this.disposableRegistry.disposeAll();
  }

  /** ローカルプレイヤー中心の可視矩形で画面外描画を抑制する */
  private applyViewportCulling(): void {
    const me = this.playerRepository.getById(this.myId);
    if (!me) {
      return;
    }

    const meDisplay = me.getDisplayObject();
    const viewport = expandWorldViewport(
      resolveWorldViewport(
        meDisplay.x,
        meDisplay.y,
        this.app.screen.width,
        this.app.screen.height,
      ),
      config.GAME_CONFIG.GRID_CELL_SIZE,
    );

    this.bombManager?.applyViewportCulling(viewport, config.GAME_CONFIG.GRID_CELL_SIZE);
    this.networkSync?.applyViewportCulling(viewport, config.GAME_CONFIG.GRID_CELL_SIZE);
  }
}
