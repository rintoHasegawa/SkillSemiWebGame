/**
 * GameManager
 * ゲーム全体の初期化，更新，破棄のライフサイクルを管理する
 * マップ，ネットワーク同期，ゲームループを統合する
 */
import { Application, Container, Ticker } from "pixi.js";
import { AppearanceResolver } from "./application/AppearanceResolver";
import { BombManager } from "./entities/bomb/BombManager";
import { GameNetworkSync } from "./application/GameNetworkSync";
import { GameLoop } from "./application/GameLoop";
import { GameEventFacade } from "./application/GameEventFacade";
import { SceneLifecycleState } from "./application/lifecycle/SceneLifecycleState";
import { GameSessionFacade } from "./application/lifecycle/GameSessionFacade";
import { CombatLifecycleFacade } from "./application/combat/CombatLifecycleFacade";
import {
  GameSceneOrchestrator,
  type GameSceneFactoryOptions,
} from "./application/orchestrators/GameSceneOrchestrator";
import {
  SocketGameActionSender,
  type GameActionSender,
} from "./application/network/GameActionSender";
import {
  SocketPlayerMoveSender,
  type MoveSender,
} from "./application/network/PlayerMoveSender";
import type { GamePlayers } from "./application/game.types";

/** GameManager の依存注入オプション型 */
export type GameManagerDependencies = {
  sessionFacade?: GameSessionFacade;
  lifecycleState?: SceneLifecycleState;
  gameActionSender?: GameActionSender;
  moveSender?: MoveSender;
  sceneFactories?: GameSceneFactoryOptions;
};

/** ゲームシーンの実行ライフサイクルを管理するマネージャー */
export class GameManager {
  private app: Application;
  private worldContainer: Container;
  private players: GamePlayers = {};
  private myId: string;
  private container: HTMLDivElement;
  private sessionFacade: GameSessionFacade;
  private appearanceResolver = new AppearanceResolver();
  private bombManager: BombManager | null = null;
  private networkSync: GameNetworkSync | null = null;
  private gameLoop: GameLoop | null = null;
  private gameEventFacade: GameEventFacade;
  private combatFacade: CombatLifecycleFacade;
  private lifecycleState: SceneLifecycleState;
  private gameActionSender: GameActionSender;
  private moveSender: MoveSender;
  private sceneFactories?: GameSceneFactoryOptions;

  public getStartCountdownSec(): number {
    return this.sessionFacade.getStartCountdownSec();
  }

  // 現在の残り秒数を取得する
  public getRemainingTime(): number {
    return this.sessionFacade.getRemainingTime();
  }

  public isInputEnabled(): boolean {
    return this.sessionFacade.canAcceptInput();
  }

  public placeBomb(): string | null {
    if (!this.sessionFacade.canAcceptInput()) return null;
    if (!this.bombManager) return null;
    const placed = this.bombManager.placeBomb();
    if (!placed) return null;

    this.gameActionSender.sendPlaceBomb(placed.payload);
    return placed.tempBombId;
  }

  // 入力と状態管理
  private joystickInput = { x: 0, y: 0 };

  public lockInput(): () => void {
    this.joystickInput = { x: 0, y: 0 };
    return this.sessionFacade.lockInput();
  }

  constructor(
    container: HTMLDivElement,
    myId: string,
    dependencies: GameManagerDependencies = {},
  ) {
    this.container = container; // 明示的に代入
    this.myId = myId;
    this.sessionFacade = dependencies.sessionFacade ?? new GameSessionFacade();
    this.lifecycleState = dependencies.lifecycleState ?? new SceneLifecycleState();
    this.gameActionSender = dependencies.gameActionSender ?? new SocketGameActionSender();
    this.moveSender = dependencies.moveSender ?? new SocketPlayerMoveSender();
    this.sceneFactories = dependencies.sceneFactories;
    this.app = new Application();
    this.worldContainer = new Container();
    this.worldContainer.sortableChildren = true;
    this.gameEventFacade = new GameEventFacade({
      onGameStart: (startTime) => {
        this.sessionFacade.setGameStart(startTime);
      },
      getBombManager: () => this.bombManager,
    });
    this.combatFacade = new CombatLifecycleFacade({
      players: this.players,
      myId: this.myId,
      acquireInputLock: this.lockInput.bind(this),
      onSendBombHitReport: (bombId) => {
        this.gameActionSender.sendBombHitReport(bombId);
      },
    });
  }

  /**
   * ゲームエンジンの初期化
   */
  public async init() {
    // PixiJS本体の初期化
    await this.app.init({
      resizeTo: window,
      backgroundColor: 0x111111,
      antialias: true,
    });

    // 初期化完了前に destroy() が呼ばれていたら、ここで処理を中断して破棄する
    if (this.lifecycleState.shouldAbortInit()) {
      this.app.destroy(true, { children: true });
      return;
    }

    this.container.appendChild(this.app.canvas);

    this.initializeSceneSubsystems();

    // サーバーへゲーム準備完了を通知
    this.gameActionSender.readyForGame();

    // メインループの登録
    this.app.ticker.add(this.tick);
    this.lifecycleState.markInitialized();
  }

  /**
   * React側からジョイスティックの入力を受け取る
   */
  public setJoystickInput(x: number, y: number) {
    this.joystickInput = this.sessionFacade.sanitizeJoystickInput({ x, y });
  }

  /**
   * 毎フレームの更新処理（メインゲームループ）
   */
  private tick = (ticker: Ticker) => {
    this.gameLoop?.tick(ticker);
  };

  /** ゲームシーンのサブシステムを初期化して配線する */
  private initializeSceneSubsystems(): void {
    const orchestrator = new GameSceneOrchestrator({
      app: this.app,
      worldContainer: this.worldContainer,
      players: this.players,
      myId: this.myId,
      appearanceResolver: this.appearanceResolver,
      getElapsedMs: () => this.sessionFacade.getElapsedMs(),
      getJoystickInput: () => this.joystickInput,
      moveSender: this.moveSender,
      onGameStart: this.gameEventFacade.handleGameStart.bind(this.gameEventFacade),
      onGameEnd: this.lockInput.bind(this),
      onBombPlacedFromOthers: (payload) => {
        this.gameEventFacade.handleBombPlacedFromOthers(payload);
      },
      onBombPlacedAckFromNetwork: (payload) => {
        this.gameEventFacade.handleBombPlacedAck(payload);
      },
      onPlayerDeadFromNetwork: (payload) => {
        this.combatFacade.handleNetworkPlayerDead(payload);
      },
      onBombExploded: (payload) => {
        this.combatFacade.handleBombExploded(payload);
      },
      factories: this.sceneFactories,
    });

    const initializedScene = orchestrator.initialize();
    this.networkSync = initializedScene.networkSync;
    this.bombManager = initializedScene.bombManager;
    this.gameLoop = initializedScene.gameLoop;
  }

  /**
   * クリーンアップ処理（コンポーネントアンマウント時）
   */
  public destroy() {
    this.lifecycleState.markDestroyed();
    if (this.lifecycleState.shouldDestroyApp()) {
      this.app.destroy(true, { children: true });
    }
    this.bombManager?.destroy();
    this.bombManager = null;
    this.combatFacade.dispose();
    this.sessionFacade.reset();
    this.players = {};
    this.joystickInput = { x: 0, y: 0 };

    // イベント購読の解除
    this.networkSync?.unbind();
  }
}
