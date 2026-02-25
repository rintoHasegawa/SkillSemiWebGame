/**
 * GameManager
 * ゲーム全体の初期化，更新，破棄のライフサイクルを管理する
 * マップ，ネットワーク同期，ゲームループを統合する
 */
import { Application, Container, Ticker } from "pixi.js";
import { socketManager } from "@client/network/SocketManager";
import { GameMapController } from "./entities/map/GameMapController";
import { GameTimer } from "./application/GameTimer";
import { GameNetworkSync } from "./application/GameNetworkSync";
import { GameLoop } from "./application/GameLoop";
import { BombManager } from "./application/BombManager";
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
  private bombManager: BombManager | null = null;
  private networkSync: GameNetworkSync | null = null;
  private gameLoop: GameLoop | null = null;

  // サーバーからゲーム開始通知（と開始時刻）を受け取った時に呼ぶ
  public setGameStart(startTime: number) {
    this.timer.setGameStart(startTime);
  }

  // 現在の残り秒数を取得する
  public getRemainingTime(): number {
    return this.timer.getRemainingTime();
  }

  public placeBomb() {
    this.bombManager?.placeBomb();
  }
  
  // 入力と状態管理
  private joystickInput = { x: 0, y: 0 };
  private isInitialized = false;
  private isDestroyed = false;

  constructor(container: HTMLDivElement, myId: string) {
    this.container = container; // 明示的に代入
    this.myId = myId;
    this.app = new Application();
    this.worldContainer = new Container();
  }

  /**
   * ゲームエンジンの初期化
   */
  public async init() {
    // PixiJS本体の初期化
    await this.app.init({ resizeTo: window, backgroundColor: 0x111111, antialias: true });

    // 初期化完了前に destroy() が呼ばれていたら、ここで処理を中断して破棄する
    if (this.isDestroyed) {
        this.app.destroy(true, { children: true });
        return;
    }

    this.container.appendChild(this.app.canvas);

    // 背景マップの配置
    const gameMap = new GameMapController();
    this.gameMap = gameMap;
    this.worldContainer.addChild(gameMap.getDisplayObject());
    this.app.stage.addChild(this.worldContainer);

    this.networkSync = new GameNetworkSync({
      worldContainer: this.worldContainer,
      players: this.players,
      myId: this.myId,
      gameMap: this.gameMap,
      onGameStart: this.setGameStart.bind(this),
    });
    this.networkSync.bind();

    this.gameLoop = new GameLoop({
      app: this.app,
      worldContainer: this.worldContainer,
      players: this.players,
      myId: this.myId,
      getJoystickInput: () => this.joystickInput,
    });

    this.bombManager = new BombManager({
      worldContainer: this.worldContainer,
      players: this.players,
      myId: this.myId,
      getElapsedMs: () => this.timer.getElapsedMs(),
    });

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
    this.joystickInput = { x, y };
  }

  /**
   * 毎フレームの更新処理（メインゲームループ）
   */
  private tick = (ticker: Ticker) => {
    this.gameLoop?.tick(ticker);
    this.bombManager?.tick();
  };

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
    this.players = {};
    
    // イベント購読の解除
    this.networkSync?.unbind();
  }
}