import { Application, Container, Ticker } from "pixi.js";
import { socketClient } from "../network/SocketClient";
import { GAME_CONFIG } from "@repo/shared";
import type { PlayerData } from "@repo/shared";
import { BasePlayer, LocalPlayer, RemotePlayer } from "../entities/Player";
import { GameMap } from "../entities/GameMap";
import { MAX_DIST } from "../input/VirtualJoystick";

export class GameManager {
  private app: Application;
  private worldContainer: Container;
  private players: Record<string, BasePlayer> = {};
  private myId: string;
  private container: HTMLDivElement;
  private gameMap!: GameMap;
  private gameStartTime: number | null = null;

  // サーバーからゲーム開始通知（と開始時刻）を受け取った時に呼ぶ
  public setGameStart(startTime: number) {
    this.gameStartTime = startTime;
  }

  // 現在の残り秒数を取得する
  public getRemainingTime(): number {
    if (!this.gameStartTime) return GAME_CONFIG.GAME_DURATION_SEC;
    
    // 現在のサーバー時刻を推定 (Date.now() + サーバーとの誤差補正が理想ですが、まずは簡易版で)
    const elapsedMs = Date.now() - this.gameStartTime;
    const remainingSec = GAME_CONFIG.GAME_DURATION_SEC - (elapsedMs / 1000);
    
    return Math.max(0, remainingSec);
  }
  
  // 入力と状態管理
  private joystickInput = { x: 0, y: 0 };
  private lastPositionSentTime = 0;
  private wasMoving = false;
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
    const gameMap = new GameMap();
    this.gameMap = gameMap;
    this.worldContainer.addChild(gameMap);
    this.app.stage.addChild(this.worldContainer);

    // ネットワークイベントの登録
    this.setupSocketListeners();

    // サーバーへゲーム準備完了を通知
    socketClient.readyForGame();

    // メインループの登録
    this.app.ticker.add(this.tick.bind(this));
    this.isInitialized = true;
  }

  /**
   * React側からジョイスティックの入力を受け取る
   */
  public setJoystickInput(x: number, y: number) {
    this.joystickInput = { x, y };
  }

  /**
   * ソケットイベントの登録
   */
  private setupSocketListeners() {
    socketClient.onCurrentPlayers((serverPlayers: PlayerData[] | Record<string, PlayerData>) => {
      const playersArray = (Array.isArray(serverPlayers) ? serverPlayers : Object.values(serverPlayers)) as PlayerData[];
      playersArray.forEach((p) => {
        const playerSprite = p.id === this.myId ? new LocalPlayer(p) : new RemotePlayer(p);
        this.worldContainer.addChild(playerSprite);
        this.players[p.id] = playerSprite;
      });
    });

    socketClient.onNewPlayer((p: PlayerData) => {
      const playerSprite = new RemotePlayer(p);
      this.worldContainer.addChild(playerSprite);
      this.players[p.id] = playerSprite;
    });

    // サーバーからの GAME_START を検知して開始時刻をセットする
    socketClient.onGameStart((data) => {
      if (data && data.startTime) {
        this.setGameStart(data.startTime);
        console.log(`[GameManager] ゲーム開始時刻同期完了: ${data.startTime}`);
      }
    });

    socketClient.onUpdatePlayer((data: Partial<PlayerData> & { id: string }) => {
      if (data.id === this.myId) return;
      const target = this.players[data.id];
      if (target && target instanceof RemotePlayer) {
        target.setTargetPosition(data.x, data.y);
      }
    });

    socketClient.onRemovePlayer((id: string) => {
      const target = this.players[id];
      if (target) {
        this.worldContainer.removeChild(target);
        target.destroy();
        delete this.players[id];
      }
    });

    socketClient.onUpdateMapCells((updates) => {
      this.gameMap.updateCells(updates);
    });
  }

  /**
   * 毎フレームの更新処理（メインゲームループ）
   */
  private tick(ticker: Ticker) {
    const me = this.players[this.myId];
    if (!me || !(me instanceof LocalPlayer)) return;

    // 1. 自プレイヤーの移動と送信
    const { x: dx, y: dy } = this.joystickInput;
    const isMoving = dx !== 0 || dy !== 0;

    if (isMoving) {
      me.move(dx / MAX_DIST, dy / MAX_DIST, ticker.deltaTime);
      
      const now = performance.now();
      if (now - this.lastPositionSentTime >= GAME_CONFIG.PLAYER_POSITION_UPDATE_MS) {
        socketClient.sendMove(me.x, me.y);
        this.lastPositionSentTime = now;
      }
    } else if (this.wasMoving) {
      socketClient.sendMove(me.x, me.y);
    }
    this.wasMoving = isMoving;

    // 2. 全プレイヤーの更新（Lerpなど）
    Object.values(this.players).forEach((player) => {
      player.update(ticker.deltaTime);
    });

    // 3. カメラの追従（自分を中心に）
    this.worldContainer.position.set(
      -(me.x - this.app.screen.width / 2),
      -(me.y - this.app.screen.height / 2)
    );
  }

  /**
   * クリーンアップ処理（コンポーネントアンマウント時）
   */
  public destroy() {
    this.isDestroyed = true;
    if (this.isInitialized) {
      this.app.destroy(true, { children: true });
    }
    this.players = {};
    
    // イベント購読の解除
    socketClient.removeAllListeners();
  }
}