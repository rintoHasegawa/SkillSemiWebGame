/**
 * GameManager
 * ゲーム全体の初期化，更新，破棄のライフサイクルを管理する
 * マップ，ネットワーク同期，ゲームループを統合する
 */
import { Application, Container, Ticker } from "pixi.js";
import { GameEventFacade } from "./application/GameEventFacade";
import { SceneLifecycleState } from "./application/lifecycle/SceneLifecycleState";
import { GameSessionFacade } from "./application/lifecycle/GameSessionFacade";
import {
  CombatLifecycleFacade,
  type CombatLifecycleFacadeOptions,
} from "./application/combat/CombatLifecycleFacade";
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
  type GameHudState,
  type MiniMapState,
  type GameUiState,
} from "./application/ui/GameUiStateSyncService";
import { isBombFeverTime } from "./application/ui/isBombFeverTime";
import { preloadGameStartAssets } from "./application/assets/GameAssetPreloader";
import { ClockSyncService } from "./application/time/ClockSyncService";
import { SYSTEM_TIME_PROVIDER } from "./application/time/TimeProvider";
import { ClockSyncLoop } from "./application/time/ClockSyncLoop";

/** GameManager の依存注入オプション型 */
export type GameManagerDependencies = {
  sessionFacade?: GameSessionFacade;
  lifecycleState?: SceneLifecycleState;
  gameActionSender?: GameActionSender;
  playerMoveSender?: MoveSender;
  moveSender?: MoveSender;
  sceneFactories?: GameSceneFactoryOptions;
};

/** GameScene の UI 表示状態型を外部参照向けに再公開する */
export type {
  GameUiState,
  GameHudState,
  MiniMapState,
} from "./application/ui/GameUiStateSyncService";

/** ゲームシーンの実行ライフサイクルを管理するマネージャー */
export class GameManager {
  private app: Application;
  private worldContainer: Container;
  private players: GamePlayers = {};
  private myId: string;
  private container: HTMLDivElement;
  private sessionFacade: GameSessionFacade;
  private gameActionSender: GameActionSender;
  private runtime: GameSceneRuntime;
  private playerMoveSender: MoveSender;
  private gameEventFacade: GameEventFacade;
  private combatFacade: CombatLifecycleFacade;
  private lifecycleState: SceneLifecycleState;
  private uiStateSyncService: GameUiStateSyncService;
  private disposableRegistry: DisposableRegistry;
  private readonly clockSyncService: ClockSyncService;
  private readonly nowMsProvider = SYSTEM_TIME_PROVIDER.now;
  private readonly clockSyncLoop: ClockSyncLoop;
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
    this.clockSyncService = new ClockSyncService();
    this.clockSyncLoop = new ClockSyncLoop({
      sendPing: (clientTime) => {
        this.gameActionSender.sendPing(clientTime);
      },
      getNextIntervalMs: () => this.clockSyncService.getRecommendedSyncIntervalMs(),
      nowMsProvider: this.nowMsProvider,
    });
    this.sessionFacade =
      dependencies.sessionFacade ??
      new GameSessionFacade({
        signedElapsedMsProvider: () => this.clockSyncService.getElapsedMs(),
      });
    this.lifecycleState =
      dependencies.lifecycleState ?? new SceneLifecycleState();
    this.gameActionSender =
      dependencies.gameActionSender ?? new SocketGameActionSender();
    this.playerMoveSender =
      dependencies.playerMoveSender
      ?? dependencies.moveSender
      ?? new SocketPlayerMoveSender();
    const sceneFactories = dependencies.sceneFactories;
    this.app = new Application();
    this.worldContainer = new Container();
    this.worldContainer.sortableChildren = true;
    this.gameEventFacade = new GameEventFacade({
      onGameStarted: () => {
        // ゲーム開始カウントダウン中に先読みして初回被弾時の負荷を抑える
        preloadGameStartAssets();
        this.uiStateSyncService.emitIfChanged();
      },
      getBombManager: () => this.runtime.getBombManager(),
    });
    this.combatFacade = new CombatLifecycleFacade(
      this.createCombatLifecycleCallbacks(),
    );
    this.runtime = new GameSceneRuntime({
      app: this.app,
      worldContainer: this.worldContainer,
      players: this.players,
      myId: this.myId,
      sessionFacade: this.sessionFacade,
      gameActionSender: this.gameActionSender,
      moveSender: this.playerMoveSender,
      getElapsedMs: () => this.sessionFacade.getElapsedMs(),
      onPongReceived: (payload) => {
        this.clockSyncService.updateFromPong(payload);
      },
      onGameStartClockHint: (serverElapsedMs) => {
        this.clockSyncService.seedFromServerElapsed(serverElapsedMs);
      },
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
    this.disposableRegistry.add(() => {
      this.clockSyncLoop.dispose();
    });
    this.disposableRegistry.add(() => {
      this.clockSyncService.reset();
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

    this.clockSyncLoop.start();
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

  /** 被弾ライフサイクルのコールバック群を組み立てる */
  private createCombatLifecycleCallbacks(): CombatLifecycleFacadeOptions {
    return {
      players: this.players,
      myId: this.myId,
      acquireInputLock: this.lockInput.bind(this),
      onSendBombHitReport: (bombId) => {
        this.gameActionSender.sendBombHitReport(bombId);
      },
      onLocalBombHitCountChanged: (count) => {
        this.localBombHitCount = count;
        this.uiStateSyncService.emitIfChanged();
      },
      onLocalRespawnCompleted: (position) => {
        this.playerMoveSender.sendMove(position.x, position.y, { force: true });
      },
    };
  }

  /** HUD状態購読を登録し，解除関数を返す */
  public subscribeHudState(
    listener: (state: GameHudState) => void,
  ): () => void {
    return this.uiStateSyncService.subscribeHud(listener);
  }

  /** ミニマップ状態購読を登録し，解除関数を返す */
  public subscribeMiniMapState(
    listener: (state: MiniMapState) => void,
  ): () => void {
    return this.uiStateSyncService.subscribeMiniMap(listener);
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
        // 表示用に切り捨てた秒ではなく経過時間から実ゲートと同じ判定を導出する
        isFeverTime: isBombFeverTime(this.sessionFacade.getElapsedMs()),
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
