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
import { DisposableRegistry } from "./application/lifecycle/DisposableRegistry";
import { registerGameManagerDisposers } from "./application/lifecycle/registerGameManagerDisposers";
import { type GameSceneFactoryOptions } from "./application/orchestrators/GameSceneOrchestrator";
import { GameSceneRuntime } from "./application/runtime/GameSceneRuntime";
import { GameManagerBootstrapper } from "./application/runtime/GameManagerBootstrapper";
import {
  SocketGameActionSender,
  type GameActionSender,
} from "./application/network/GameActionSender";
import {
  SocketPlayerMoveSender,
  type MoveSender,
} from "./application/network/PlayerMoveSender";
import type { GamePlayers } from "./application/game.types";
import type { HurricaneHitPayload } from "@repo/shared";
import {
  GameUiStateSyncService,
  type GameUiState,
} from "./application/ui/GameUiStateSyncService";
import { preloadGameStartAssets } from "./application/assets/GameAssetPreloader";

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
  private disposableRegistry: DisposableRegistry;
  private localBombHitCount = 0;

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
    this.lifecycleState =
      dependencies.lifecycleState ?? new SceneLifecycleState();
    const gameActionSender =
      dependencies.gameActionSender ?? new SocketGameActionSender();
    const moveSender = dependencies.moveSender ?? new SocketPlayerMoveSender();
    const sceneFactories = dependencies.sceneFactories;
    this.app = new Application();
    this.worldContainer = new Container();
    this.worldContainer.sortableChildren = true;
    this.gameEventFacade = new GameEventFacade({
      onGameStarted: (startTime) => {
        // ゲーム開始カウントダウン中に先読みして初回被弾時の負荷を抑える
        preloadGameStartAssets();
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
      onLocalBombHitCountChanged: (count) => {
        this.localBombHitCount = count;
        this.uiStateSyncService.emitIfChanged();
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
        onGameStarted: this.gameEventFacade.applyGameStarted.bind(
          this.gameEventFacade,
        ),
        onGameEnded: this.lockInput.bind(this),
        onRemoteBombPlaced: (payload) => {
          this.gameEventFacade.applyRemoteBombPlaced(payload);
        },
        onBombPlacementAcknowledged: (payload) => {
          this.gameEventFacade.applyBombPlacementAcknowledged(payload);
        },
        onRemotePlayerHit: (payload) => {
          this.combatFacade.handleNetworkPlayerHit(payload);
        },
        onRemoteHurricaneHit: (payload: HurricaneHitPayload) => {
          this.combatFacade.handleNetworkHurricaneHit(payload);
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
    this.disposableRegistry = new DisposableRegistry();
    registerGameManagerDisposers({
      disposableRegistry: this.disposableRegistry,
      uiStateSyncService: this.uiStateSyncService,
      resetPlayers: () => {
        this.players = {};
      },
      sessionFacade: this.sessionFacade,
      combatFacade: this.combatFacade,
      runtime: this.runtime,
      lifecycleState: this.lifecycleState,
      app: this.app,
    });
  }

  /**
   * ゲームエンジンの初期化
   */
  public async init() {
    const bootstrapper = new GameManagerBootstrapper({
      app: this.app,
      lifecycleState: this.lifecycleState,
      container: this.container,
      runtime: this.runtime,
      tick: this.tick,
    });

    const result = await bootstrapper.bootstrap();
    if (!result.initialized) {
      return;
    }

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
    this.uiStateSyncService.emitIfChanged();
  };

  /** UI状態購読を登録し，解除関数を返す */
  public subscribeUiState(listener: (state: GameUiState) => void): () => void {
    return this.uiStateSyncService.subscribe(listener);
  }

  private getUiStateSnapshot(): GameUiState {
    const miniMapTeamIds = this.runtime.getMiniMapTeamIds();

    return {
      hud: {
        remainingTimeSec: Math.floor(this.sessionFacade.getRemainingTime()),
        startCountdownSec: this.sessionFacade.getStartCountdownSec(),
        isInputEnabled: this.runtime.isInputEnabled(),
        teamPaintRates: this.runtime.getPaintRatesByTeam(),
        localBombHitCount: this.localBombHitCount,
      },
      miniMap: {
        mapRevision: this.runtime.getMiniMapRevision(),
        teamIds: miniMapTeamIds,
        localPlayerPosition: this.runtime.getLocalPlayerPosition(),
      },
    };
  }

  /**
   * クリーンアップ処理（コンポーネントアンマウント時）
   */
  public destroy() {
    this.lifecycleState.markDestroyed();
    this.disposableRegistry.disposeAll();
  }
}
