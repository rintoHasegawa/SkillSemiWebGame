/**
 * GameManager
 * ゲーム全体の初期化，更新，破棄のライフサイクルを管理する
 * マップ，ネットワーク同期，ゲームループを統合する
 */
import { Application, Container, Ticker } from "pixi.js";
import { GameEventFacade } from "./application/GameEventFacade";
import { SceneLifecycleState } from "./application/lifecycle/SceneLifecycleState";
import { GameSessionFacade } from "./application/lifecycle/GameSessionFacade";
import { CombatLifecycleFacade } from "./application/combat/CombatLifecycleFacade";
import {
  type GameSceneFactoryOptions,
} from "./application/orchestrators/GameSceneOrchestrator";
import { GameSceneRuntime } from "./application/runtime/GameSceneRuntime";
import {
  SocketGameActionSender,
  type GameActionSender,
} from "./application/network/GameActionSender";
import {
  SocketPlayerMoveSender,
  type MoveSender,
} from "./application/network/PlayerMoveSender";
import type { GamePlayers } from "./application/game.types";
import {
  GameUiStateSyncService,
  type GameUiState,
} from "./application/ui/GameUiStateSyncService";

/** GameManager の依存注入オプション型 */
export type GameManagerDependencies = {
  sessionFacade?: GameSessionFacade;
  lifecycleState?: SceneLifecycleState;
  gameActionSender?: GameActionSender;
  moveSender?: MoveSender;
  sceneFactories?: GameSceneFactoryOptions;
};

/** GameScene の UI 表示状態型を外部参照向けに再公開する */
export type { GameUiState } from "./application/ui/GameUiStateSyncService";

/** ゲームシーンの実行ライフサイクルを管理するマネージャー */
export class GameManager {
  private app: Application;
  private worldContainer: Container;
  private players: GamePlayers = {};
  private myId: string;
  private container: HTMLDivElement;
  private sessionFacade: GameSessionFacade;
  private runtime: GameSceneRuntime;
  private gameEventFacade: GameEventFacade;
  private combatFacade: CombatLifecycleFacade;
  private lifecycleState: SceneLifecycleState;
  private uiStateSyncService: GameUiStateSyncService;

  public getStartCountdownSec(): number {
    return this.sessionFacade.getStartCountdownSec();
  }

  // 現在の残り秒数を取得する
  public getRemainingTime(): number {
    return this.sessionFacade.getRemainingTime();
  }

  public isInputEnabled(): boolean {
    return this.runtime.isInputEnabled();
  }

  public placeBomb(): string | null {
    return this.runtime.placeBomb();
  }

  public lockInput(): () => void {
    this.runtime.clearJoystickInput();
    const release = this.sessionFacade.lockInput();
    this.uiStateSyncService.emitIfChanged();

    return () => {
      release();
      this.uiStateSyncService.emitIfChanged();
    };
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
    const gameActionSender = dependencies.gameActionSender ?? new SocketGameActionSender();
    const moveSender = dependencies.moveSender ?? new SocketPlayerMoveSender();
    const sceneFactories = dependencies.sceneFactories;
    this.app = new Application();
    this.worldContainer = new Container();
    this.worldContainer.sortableChildren = true;
    this.gameEventFacade = new GameEventFacade({
      onGameStart: (startTime) => {
        this.sessionFacade.setGameStart(startTime);
        this.uiStateSyncService.emitIfChanged();
      },
      getBombManager: () => this.runtime.getBombManager(),
    });
    this.combatFacade = new CombatLifecycleFacade({
      players: this.players,
      myId: this.myId,
      acquireInputLock: this.lockInput.bind(this),
      onSendBombHitReport: (bombId) => {
        gameActionSender.sendBombHitReport(bombId);
      },
    });
    this.runtime = new GameSceneRuntime({
      app: this.app,
      worldContainer: this.worldContainer,
      players: this.players,
      myId: this.myId,
      sessionFacade: this.sessionFacade,
      gameActionSender,
      moveSender,
      getElapsedMs: () => this.sessionFacade.getElapsedMs(),
      eventPorts: {
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
      },
      sceneFactories,
    });
    this.uiStateSyncService = new GameUiStateSyncService({
      getSnapshot: () => this.getUiStateSnapshot(),
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

    this.runtime.initialize();

    // サーバーへゲーム準備完了を通知
    this.runtime.readyForGame();

    // メインループの登録
    this.app.ticker.add(this.tick);
    this.lifecycleState.markInitialized();
    this.uiStateSyncService.startTicker();
    this.uiStateSyncService.emitIfChanged(true);
  }

  /**
   * React側からジョイスティックの入力を受け取る
   */
  public setJoystickInput(x: number, y: number) {
    this.runtime.setJoystickInput(x, y);
  }

  /**
   * 毎フレームの更新処理（メインゲームループ）
   */
  private tick = (ticker: Ticker) => {
    this.runtime.tick(ticker);
  };

  /** UI状態購読を登録し，解除関数を返す */
  public subscribeUiState(listener: (state: GameUiState) => void): () => void {
    return this.uiStateSyncService.subscribe(listener);
  }

  private getUiStateSnapshot(): GameUiState {
    return {
      remainingTimeSec: Math.floor(this.sessionFacade.getRemainingTime()),
      startCountdownSec: this.sessionFacade.getStartCountdownSec(),
      isInputEnabled: this.runtime.isInputEnabled(),
    };
  }

  /**
   * クリーンアップ処理（コンポーネントアンマウント時）
   */
  public destroy() {
    this.lifecycleState.markDestroyed();
    this.uiStateSyncService.stopTicker();
    if (this.lifecycleState.shouldDestroyApp()) {
      this.app.destroy(true, { children: true });
    }
    this.runtime.destroy();
    this.combatFacade.dispose();
    this.sessionFacade.reset();
    this.players = {};
    this.uiStateSyncService.clear();
  }
}
