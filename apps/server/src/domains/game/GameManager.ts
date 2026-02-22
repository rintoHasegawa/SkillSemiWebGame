import { Player } from "./entities/Player.js";
import { GAME_CONFIG } from "@repo/shared";
import { MapStore } from "./states/MapStore";
import { getGridIndexFromPosition } from "@repo/shared";
import type { CellUpdate } from "@repo/shared";
import { GameLoop, type TickData } from "./GameLoop";

// プレイヤー集合の生成・更新・参照管理クラス
export class GameManager {
  private players: Map<string, Player>;
  private mapStore: MapStore;
  private gameLoops: Map<string, GameLoop>; // NodeJS.Timeout から変更
  private roomStartTimes: Map<string, number>;  // ルームごとのゲーム開始時間を保持する

  constructor() {
    this.players = new Map();
    this.mapStore = new MapStore();
    this.gameLoops = new Map();
    this.roomStartTimes = new Map();
  }

  // 外部（GameHandlerなど）から開始時刻を取得できるようにする
  getRoomStartTime(roomId: string): number | undefined {
    return this.roomStartTimes.get(roomId);
  }

  // 新規プレイヤー登録と初期位置設定処理
  addPlayer(id: string): Player {
    const player = new Player(id);
    player.x = GAME_CONFIG.MAP_WIDTH / 2;
    player.y = GAME_CONFIG.MAP_HEIGHT / 2;
    this.players.set(id, player);
    return player;
  }

  // プレイヤー登録解除処理
  removePlayer(id: string) {
    this.players.delete(id);
  }

  // 指定IDプレイヤー参照取得
  getPlayer(id: string) {
    return this.players.get(id);
  }

  // 指定プレイヤー座標更新処理
  movePlayer(id: string, x: number, y: number) {
    const player = this.players.get(id);
    if (player) {
      console.log(`Move Request -> ID:${id.slice(0,4)} x:${Math.round(x)} y:${Math.round(y)}`);
      if (typeof x !== "number" || typeof y !== "number" || isNaN(x) || isNaN(y)) {
        console.log("⚠️ 無効なデータなので無視しました");
        return;
      }
      player.x = x;
      player.y = y;
    }
  }

  /**
   * 20Hz固定のゲームループを開始する
   * @param roomId ルームID
   * @param playerIds このルームに参加しているプレイヤーのIDリスト
   * @param onTick 毎フレーム実行される送信用のコールバック関数
   */
  startGameLoop(
    roomId: string, 
    playerIds: string[], 
    onTick: (data: TickData) => void,
    onGameEnd: () => void
  ) {
    if (this.gameLoops.has(roomId)) return;

    const tickRate = GAME_CONFIG.PLAYER_POSITION_UPDATE_MS;

    // ループ開始時に、このルームの開始時刻を記憶する
    this.roomStartTimes.set(roomId, Date.now());
    
    // GameLoopインスタンスを生成し、参照を渡す
    const loop = new GameLoop(
      roomId,
      tickRate,
      playerIds,
      this.players,
      this.mapStore,
      onTick,
      () => {
        // GameLoopが終了した時の処理
        this.roomStartTimes.delete(roomId);
        this.gameLoops.delete(roomId);
        onGameEnd(); // GameHandlerへ終了を伝える
      }
    );

    loop.start();
    this.gameLoops.set(roomId, loop);
  }

  /**
   * ゲームループを停止する
   */
  stopGameLoop(roomId: string) {
    const loop = this.gameLoops.get(roomId);
    if (loop) {
      loop.stop();
      this.gameLoops.delete(roomId);
      this.roomStartTimes.delete(roomId); // 停止時も忘れずクリア
    }
  }

  // 登録中全プレイヤー配列取得
  getAllPlayers() {
    return Array.from(this.players.values());
  }

  // 【一時的】移動したプレイヤーの足元を塗り、差分を返すメソッド
  public paintAndGetUpdates(playerId: string): CellUpdate[] {
    const player = this.players.get(playerId);
    if (!player) return [];

    const gridIndex = getGridIndexFromPosition(player.x, player.y);
    if (gridIndex !== null) {
      this.mapStore.paintCell(gridIndex, player.teamId);
    }

    return this.mapStore.getAndClearUpdates();
  }
}