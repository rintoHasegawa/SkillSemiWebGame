/**
 * GameManager
 * ゲーム全体の初期化，更新，破棄のライフサイクルを管理する
 * マップ，ネットワーク同期，ゲームループを統合する
 */
import { Application, Container, Ticker } from "pixi.js";
import type {
  BombPlacedAckPayload,
  BombPlacedPayload,
} from "@repo/shared";
import { config } from "@client/config";
import { socketManager } from "@client/network/SocketManager";
import { AppearanceResolver } from "./application/AppearanceResolver";
import { BombManager } from "./entities/bomb/BombManager";
import { GameNetworkSync } from "./application/GameNetworkSync";
import { GameLoop } from "./application/GameLoop";
import { BombHitContextProvider } from "./application/BombHitContextProvider";
import { BombHitOrchestrator } from "./application/BombHitOrchestrator";
import { PlayerDeathPolicy } from "./application/PlayerDeathPolicy";
import { PlayerHitEffectOrchestrator } from "./application/PlayerHitEffectOrchestrator";
import { SceneLifecycleState } from "./application/lifecycle/SceneLifecycleState";
import { GameSessionFacade } from "./application/lifecycle/GameSessionFacade";
import { HitReportPolicy } from "./application/combat/HitReportPolicy";
import { GameSceneOrchestrator } from "./application/orchestrators/GameSceneOrchestrator";
import type { BombHitEvaluationResult } from "./application/BombHitOrchestrator";
import type { GamePlayers } from "./application/game.types";

/** ゲームシーンの実行ライフサイクルを管理するマネージャー */
export class GameManager {
  private app: Application;
  private worldContainer: Container;
  private players: GamePlayers = {};
  private myId: string;
  private container: HTMLDivElement;
  private sessionFacade = new GameSessionFacade();
  private appearanceResolver = new AppearanceResolver();
  private bombManager: BombManager | null = null;
  private bombHitOrchestrator: BombHitOrchestrator | null = null;
  private networkSync: GameNetworkSync | null = null;
  private gameLoop: GameLoop | null = null;
  private playerDeathPolicy!: PlayerDeathPolicy;
  private playerHitEffectOrchestrator!: PlayerHitEffectOrchestrator;
  private lifecycleState = new SceneLifecycleState();
  private hitReportPolicy = new HitReportPolicy();

  // サーバーからゲーム開始通知（と開始時刻）を受け取った時に呼ぶ
  public setGameStart(startTime: number) {
    this.sessionFacade.setGameStart(startTime);
  }

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

    socketManager.game.sendPlaceBomb(placed.payload);
    return placed.tempBombId;
  }

  public applyPlacedBombFromOthers(payload: BombPlacedPayload): void {
    this.bombManager?.applyPlacedBombFromOthers(payload);
  }

  public applyPlacedBombAck(payload: BombPlacedAckPayload): void {
    this.bombManager?.applyPlacedBombAck(payload);
  }

  // 入力と状態管理
  private joystickInput = { x: 0, y: 0 };

  public lockInput(): () => void {
    this.joystickInput = { x: 0, y: 0 };
    return this.sessionFacade.lockInput();
  }

  constructor(container: HTMLDivElement, myId: string) {
    this.container = container; // 明示的に代入
    this.myId = myId;
    this.app = new Application();
    this.worldContainer = new Container();
    this.worldContainer.sortableChildren = true;
    this.initializeHitSubsystem();
  }

  /** 被弾時の入力制御と演出発火のサブシステムを初期化する */
  private initializeHitSubsystem(): void {
    this.playerDeathPolicy = new PlayerDeathPolicy({
      myId: this.myId,
      hitStunMs: config.GAME_CONFIG.PLAYER_HIT_STUN_MS,
      acquireInputLock: this.lockInput.bind(this),
    });
    this.playerHitEffectOrchestrator = new PlayerHitEffectOrchestrator({
      players: this.players,
      blinkDurationMs: config.GAME_CONFIG.PLAYER_HIT_EFFECT.BLINK_DURATION_MS,
      dedupWindowMs: config.GAME_CONFIG.PLAYER_HIT_EFFECT.DEDUP_WINDOW_MS,
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
    socketManager.game.readyForGame();

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

  /** 爆弾管理と当たり判定橋渡しを初期化する */
  private initializeBombHitSubsystem(): void {
    const bombHitContextProvider = new BombHitContextProvider({
      players: this.players,
      myId: this.myId,
    });
    this.bombHitOrchestrator = new BombHitOrchestrator({
      contextProvider: bombHitContextProvider,
    });
  }

  /** ゲームシーンのサブシステムを初期化して配線する */
  private initializeSceneSubsystems(): void {
    this.initializeBombHitSubsystem();

    const orchestrator = new GameSceneOrchestrator({
      app: this.app,
      worldContainer: this.worldContainer,
      players: this.players,
      myId: this.myId,
      appearanceResolver: this.appearanceResolver,
      getElapsedMs: () => this.sessionFacade.getElapsedMs(),
      getJoystickInput: () => this.joystickInput,
      onGameStart: this.setGameStart.bind(this),
      onGameEnd: this.lockInput.bind(this),
      onBombPlacedFromOthers: (payload) => {
        this.applyPlacedBombFromOthers(payload);
      },
      onBombPlacedAckFromNetwork: (payload) => {
        this.applyPlacedBombAck(payload);
      },
      onPlayerDeadFromNetwork: (payload) => {
        this.playerDeathPolicy.applyPlayerDeadEvent(payload);
        this.playerHitEffectOrchestrator.handleNetworkPlayerDead(payload.playerId, this.myId);
      },
      onBombExploded: (payload) => {
        const result = this.bombHitOrchestrator?.handleBombExploded(payload);
        this.handleBombHitEvaluation(result, payload.bombId);
      },
    });

    const initializedScene = orchestrator.initialize();
    this.networkSync = initializedScene.networkSync;
    this.bombManager = initializedScene.bombManager;
    this.gameLoop = initializedScene.gameLoop;
  }

  /** 爆弾当たり判定の評価結果を受け取り，後続処理へ接続する */
  private handleBombHitEvaluation(
    result: BombHitEvaluationResult | undefined,
    bombId: string,
  ): void {
    if (!this.hitReportPolicy.shouldSendReport(result, bombId)) {
      return;
    }

    this.playerDeathPolicy.applyLocalHitStun();
    this.playerHitEffectOrchestrator.handleLocalBombHit(this.myId);

    socketManager.game.sendBombHitReport({ bombId });
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
    this.bombHitOrchestrator?.clear();
    this.bombHitOrchestrator = null;
    this.playerDeathPolicy.dispose();
    this.hitReportPolicy.clear();
    this.sessionFacade.reset();
    this.players = {};
    this.joystickInput = { x: 0, y: 0 };

    // イベント購読の解除
    this.networkSync?.unbind();
  }
}
