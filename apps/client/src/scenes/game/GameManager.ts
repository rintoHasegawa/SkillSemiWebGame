import { Application, Container, Ticker } from "pixi.js";
import { socketManager } from "@client/network/SocketManager";
import { config } from "@repo/shared";
import type { playerTypes } from "@repo/shared";
import { LocalPlayerController, RemotePlayerController } from "./entities/player/PlayerController";
import { GameMapController } from "./entities/map/GameMapController";

export class GameManager {
  private app: Application;
  private worldContainer: Container;
  private players: Record<string, LocalPlayerController | RemotePlayerController> = {};
  private myId: string;
  private container: HTMLDivElement;
  private gameMap!: GameMapController;
  private gameStartTime: number | null = null;

  // サーバーからゲーム開始通知（と開始時刻）を受け取った時に呼ぶ
  public setGameStart(startTime: number) {
    this.gameStartTime = startTime;
  }

  // 現在の残り秒数を取得する
  public getRemainingTime(): number {
    if (!this.gameStartTime) return config.GAME_CONFIG.GAME_DURATION_SEC;
    
    // 現在のサーバー時刻を推定 (Date.now() + サーバーとの誤差補正が理想ですが、まずは簡易版で)
    const elapsedMs = Date.now() - this.gameStartTime;
    const remainingSec = config.GAME_CONFIG.GAME_DURATION_SEC - (elapsedMs / 1000);
    
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
    const gameMap = new GameMapController();
    this.gameMap = gameMap;
    this.worldContainer.addChild(gameMap.getDisplayObject());
    this.app.stage.addChild(this.worldContainer);

    // ネットワークイベントの登録
    this.setupSocketListeners();

    // サーバーへゲーム準備完了を通知
    socketManager.game.readyForGame();

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
    socketManager.game.onCurrentPlayers((serverPlayers: playerTypes.PlayerData[] | Record<string, playerTypes.PlayerData>) => {
      const playersArray = (Array.isArray(serverPlayers) ? serverPlayers : Object.values(serverPlayers)) as playerTypes.PlayerData[];
      playersArray.forEach((p) => {
        const playerController = p.id === this.myId ? new LocalPlayerController(p) : new RemotePlayerController(p);
        this.worldContainer.addChild(playerController.getDisplayObject());
        this.players[p.id] = playerController;
      });
    });

    socketManager.game.onNewPlayer((p: playerTypes.PlayerData) => {
      const playerController = new RemotePlayerController(p);
      this.worldContainer.addChild(playerController.getDisplayObject());
      this.players[p.id] = playerController;
    });

    // サーバーからの GAME_START を検知して開始時刻をセットする
    socketManager.game.onGameStart((data) => {
      if (data && data.startTime) {
        this.setGameStart(data.startTime);
        console.log(`[GameManager] ゲーム開始時刻同期完了: ${data.startTime}`);
      }
    });

    socketManager.game.onUpdatePlayer((data: Partial<playerTypes.PlayerData> & { id: string }) => {
      if (data.id === this.myId) return;
      const target = this.players[data.id];
      if (target && target instanceof RemotePlayerController) {
        target.applyRemoteUpdate({ x: data.x, y: data.y });
      }
    });

    socketManager.game.onRemovePlayer((id: string) => {
      const target = this.players[id];
      if (target) {
        this.worldContainer.removeChild(target.getDisplayObject());
        target.destroy();
        delete this.players[id];
      }
    });

    socketManager.game.onUpdateMapCells((updates) => {
      this.gameMap.updateCells(updates);
    });
  }

  /**
   * 毎フレームの更新処理（メインゲームループ）
   */
  private tick(ticker: Ticker) {
    const me = this.players[this.myId];
    if (!me || !(me instanceof LocalPlayerController)) return;

    const deltaSeconds = ticker.deltaMS / 1000;

    // 1. 自プレイヤーの移動と送信
    const { x: dx, y: dy } = this.joystickInput;
    const isMoving = dx !== 0 || dy !== 0;

    if (isMoving) {
      me.applyLocalInput({ axisX: dx, axisY: dy, deltaTime: deltaSeconds });
      me.tick();
      
      const now = performance.now();
      if (now - this.lastPositionSentTime >= config.GAME_CONFIG.PLAYER_POSITION_UPDATE_MS) {
        const position = me.getPosition();
        socketManager.game.sendMove(position.x, position.y);
        this.lastPositionSentTime = now;
      }
    } else if (this.wasMoving) {
      me.tick();
      const position = me.getPosition();
      socketManager.game.sendMove(position.x, position.y);
    } else {
      me.tick();
    }
    this.wasMoving = isMoving;

    // 2. 全プレイヤーの更新（Lerpなど）
    Object.values(this.players).forEach((player) => {
      if (player instanceof RemotePlayerController) {
        player.tick(deltaSeconds);
      }
    });

    // 3. カメラの追従（自分を中心に）
    const meDisplay = me.getDisplayObject();
    this.worldContainer.position.set(
      -(meDisplay.x - this.app.screen.width / 2),
      -(meDisplay.y - this.app.screen.height / 2)
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
    socketManager.game.removeAllListeners();
  }
}