/**
 * GameManager
 * ゲーム全体の初期化，更新，破棄のライフサイクルを管理する
 * マップ，ネットワーク同期，ゲームループを統合する
 */
import { Application, Container } from "pixi.js"; // 💡 Tickerのインポートは不要になりました
import { socketManager } from "@client/network/SocketManager";
import { config } from "@repo/shared";
import { GameMapController } from "./entities/map/GameMapController";
import { GameTimer } from "./application/GameTimer";
import { GameNetworkSync } from "./application/GameNetworkSync";
import { GameLoop } from "./application/GameLoop";
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

  // 入力と状態管理
  private joystickInput = { x: 0, y: 0 };
  private isInitialized = false;
  private isDestroyed = false;

  constructor(container: HTMLDivElement, myId: string) {
    this.container = container;
    this.myId = myId;

    // 💡 PixiJS v7: コンストラクタで画面サイズを固定して初期化
    const { SCREEN_WIDTH, SCREEN_HEIGHT } = config.GAME_CONFIG;
    this.app = new Application({
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      backgroundColor: 0x111111,
      antialias: true,
    });

    this.worldContainer = new Container();
  }

  /**
   * ゲームエンジンの初期化
   */
  public async init() {
    if (this.isDestroyed) {
      this.app.destroy(true, { children: true });
      return;
    }

    // 💡 PixiJS v7: viewをHTMLCanvasElementとしてキャスト
    const canvas = this.app.view as HTMLCanvasElement;
    this.container.appendChild(canvas);

    // 💡 全デバイスで同じ範囲が見えるようにフィットさせる
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.objectFit = "contain";

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

    // サーバーへゲーム準備完了を通知
    socketManager.game.readyForGame();

    // 💡 修正ポイント: PixiJS v7のTicker仕様に合わせた登録
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
  // 💡 修正ポイント: 引数を deltaTime (number) に変更
  private tick = (_deltaTime: number) => {
    // GameLoop内の処理が app.ticker を参照しているため、実体を渡す
    this.gameLoop?.tick(this.app.ticker);
  };

  /**
   * クリーンアップ処理（コンポーネントアンマウント時）
   */
  public destroy() {
    this.isDestroyed = true;
    if (this.isInitialized) {
      // 💡 修正ポイント: tickerから削除してから破棄
      this.app.ticker.remove(this.tick);
      this.app.destroy(true, { children: true });
    }
    this.players = {};
    this.networkSync?.unbind();
  }
}
