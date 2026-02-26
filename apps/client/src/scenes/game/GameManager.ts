/**
 * GameManager
 * ゲーム全体の初期化，更新，破棄のライフサイクルを管理する
 * マップ，ネットワーク同期，ゲームループを統合する
 */
import { Application, Container, Ticker } from "pixi.js";
import type { BombPlacedAckPayload, BombPlacedPayload } from "@repo/shared";
import { socketManager } from "@client/network/SocketManager";
import { AppearanceResolver } from "./application/AppearanceResolver";
import { GameMapController } from "./entities/map/GameMapController";
import { BombManager } from "./entities/bomb/BombManager";
import { GameTimer } from "./application/GameTimer";
import { GameNetworkSync } from "./application/GameNetworkSync";
import { GameLoop } from "./application/GameLoop";
import { BombHitContextProvider } from "./application/BombHitContextProvider";
import { BombHitOrchestrator } from "./application/BombHitOrchestrator";
import type { BombHitEvaluationResult } from "./application/BombHitOrchestrator";
import type { GamePlayers } from "./application/game.types";

/** ゲームシーンの実行ライフサイクルを管理するマネージャー */
export class GameManager {
  private app: Application;
  private worldContainer: Container;
  private players: GamePlayers = {};
  private myId: string;
  private container: HTMLDivElement;
  private gameMap!: GameMapController;
  private timer = new GameTimer();
  private appearanceResolver = new AppearanceResolver();
  private bombManager: BombManager | null = null;
  private bombHitOrchestrator: BombHitOrchestrator | null = null;
  private networkSync: GameNetworkSync | null = null;
  private gameLoop: GameLoop | null = null;

  // サーバーからゲーム開始通知（と開始時刻）を受け取った時に呼ぶ
  public setGameStart(startTime: number) {
    this.timer.setGameStart(startTime);
  }

  public getStartCountdownSec(): number {
    return this.timer.getPreStartRemainingSec();
  }

  private canAcceptInput(): boolean {
    return !this.isInputLocked && this.timer.isStarted();
  }

  // 現在の残り秒数を取得する
  public getRemainingTime(): number {
    return this.timer.getRemainingTime();
  }

  public placeBomb(): string | null {
    if (!this.canAcceptInput()) return null;
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
  private isInitialized = false;
  private isDestroyed = false;
  private isInputLocked = false;

  public lockInput() {
    this.isInputLocked = true;
    this.joystickInput = { x: 0, y: 0 };
  }

  constructor(container: HTMLDivElement, myId: string) {
    this.container = container; // 明示的に代入
    this.myId = myId;
    this.app = new Application();
    this.worldContainer = new Container();
    this.worldContainer.sortableChildren = true;
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
    if (this.isDestroyed) {
      this.app.destroy(true, { children: true });
      return;
    }

    this.container.appendChild(this.app.canvas);

    this.initializeWorld();
    this.initializeNetworkSync();
    this.initializeBombSubsystem();
    this.initializeGameLoop();

    // サーバーへゲーム準備完了を通知
    socketManager.game.readyForGame();

    // メインループの登録
    this.app.ticker.add(this.tick);
    this.isInitialized = true;
  }

  /**
   * React側からジョイスティックの入力を受け取る
   */
  public setJoystickInput(x: number, y: number) {
    if (!this.canAcceptInput()) {
      this.joystickInput = { x: 0, y: 0 };
      return;
    }
    this.joystickInput = { x, y };
  }

  /**
   * 毎フレームの更新処理（メインゲームループ）
   */
  private tick = (ticker: Ticker) => {
    this.gameLoop?.tick(ticker);
  };

  /** 背景マップとワールド描画コンテナを初期化する */
  private initializeWorld(): void {
    const gameMap = new GameMapController(this.appearanceResolver);
    this.gameMap = gameMap;
    this.worldContainer.addChild(gameMap.getDisplayObject());
    this.app.stage.addChild(this.worldContainer);
  }

  /** ネットワーク購読を初期化してバインドする */
  private initializeNetworkSync(): void {
    this.networkSync = new GameNetworkSync({
      worldContainer: this.worldContainer,
      players: this.players,
      myId: this.myId,
      gameMap: this.gameMap,
      appearanceResolver: this.appearanceResolver,
      onGameStart: this.setGameStart.bind(this),
      onGameEnd: this.lockInput.bind(this),
      onBombPlacedFromOthers: (payload) => {
        this.applyPlacedBombFromOthers(payload);
      },
      onBombPlacedAckFromNetwork: (payload) => {
        this.applyPlacedBombAck(payload);
      },
    });
    this.networkSync.bind();
  }

  /** 爆弾管理と当たり判定橋渡しを初期化する */
  private initializeBombSubsystem(): void {
    const bombHitContextProvider = new BombHitContextProvider({
      players: this.players,
      myId: this.myId,
    });
    this.bombHitOrchestrator = new BombHitOrchestrator({
      contextProvider: bombHitContextProvider,
    });

    this.bombManager = new BombManager({
      worldContainer: this.worldContainer,
      players: this.players,
      myId: this.myId,
      getElapsedMs: () => this.timer.getElapsedMs(),
      appearanceResolver: this.appearanceResolver,
      onBombExploded: (payload) => {
        const result = this.bombHitOrchestrator?.handleBombExploded(payload);
        this.handleBombHitEvaluation(result, payload.bombId);
      },
    });
  }

  /** ゲームループを初期化する */
  private initializeGameLoop(): void {
    if (!this.bombManager) {
      return;
    }

    this.gameLoop = new GameLoop({
      app: this.app,
      worldContainer: this.worldContainer,
      players: this.players,
      myId: this.myId,
      getJoystickInput: () => this.joystickInput,
      bombManager: this.bombManager,
    });
  }

  /** 爆弾当たり判定の評価結果を受け取り，後続処理へ接続する */
  private handleBombHitEvaluation(
    result: BombHitEvaluationResult | undefined,
    bombId: string,
  ): void {
    if (result !== "hit") {
      return;
    }

    socketManager.game.sendBombHitReport({ bombId });
  }

  /**
   * クリーンアップ処理（コンポーネントアンマウント時）
   */
  public destroy() {
    this.isDestroyed = true;
    if (this.isInitialized) {
      this.app.destroy(true, { children: true });
    }
    this.bombManager?.destroy();
    this.bombManager = null;
    this.bombHitOrchestrator?.clear();
    this.bombHitOrchestrator = null;
    this.players = {};
    this.isInputLocked = false;

    // イベント購読の解除
    this.networkSync?.unbind();
  }
}
