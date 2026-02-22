import { Player } from "../entities/Player.js";
import { GAME_CONFIG } from "@repo/shared/src/config/gameConfig";
import { MapStore } from "../states/MapStore";
import { getGridIndexFromPosition } from "@repo/shared/src/domains/gridMap/gridMap.logic";
import type { CellUpdate } from "@repo/shared/src/domains/gridMap/gridMap.type";
import { SocketEvents } from "@repo/shared/src/protocol/events"
import { Server } from "socket.io";

// プレイヤー集合の生成・更新・参照管理クラス
export class GameManager {
  private players: Map<string, Player>;
  private mapStore: MapStore;
  private gameLoops: Map<string, NodeJS.Timeout>;

  constructor() {
    this.players = new Map();
    this.mapStore = new MapStore();
    this.gameLoops = new Map();
  }

  // 新規プレイヤー登録と初期位置設定処理
  addPlayer(id: string): Player {
    const player = new Player(id);
    
    // 初期スポーン位置
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
      
      // 受信移動要求ログ
      console.log(`Move Request -> ID:${id.slice(0,4)} x:${Math.round(x)} y:${Math.round(y)}`);

      // 無効座標データ防御チェック
      if (typeof x !== "number" || typeof y !== "number" || isNaN(x) || isNaN(y)) {
        console.log("⚠️ 無効なデータなので無視しました");
        return;
      }

      // クライアント送信絶対座標の直接反映
      player.x = x;
      player.y = y;
    }
  }

  /**
   * 20Hz固定のゲームループを開始する
   * @param roomId ルームID
   * @param io WebSocketサーバーインスタンス
   * @param playerIds このルームに参加しているプレイヤーのIDリスト
   */
  startGameLoop(roomId: string, io: Server, playerIds: string[]) {
    // 既にループが回っている場合は何もしない
    if (this.gameLoops.has(roomId)) return;

    // gameConfigから20Hz（50ms）の定数を取得
    const tickRate = GAME_CONFIG.PLAYER_POSITION_UPDATE_MS;

    const loopId = setInterval(() => {
      // 1. 各プレイヤーの処理
      playerIds.forEach(id => {
        const player = this.players.get(id);
        if (!player) return;

        // マス塗りの判定
        const gridIndex = getGridIndexFromPosition(player.x, player.y);
        if (gridIndex !== null) {
          this.mapStore.paintCell(gridIndex, player.teamId);
        }

        // 【追加】ここで各プレイヤーの最新座標をクライアントに送信する！
        io.to(roomId).emit(SocketEvents.UPDATE_PLAYER, {
          id: player.id,
          x: player.x,
          y: player.y,
          teamId: player.teamId
        });
      });

      // 2. マスの差分（Diff）を取得
      const cellUpdates = this.mapStore.getAndClearUpdates();

      // 3. 差分があれば、ルーム内の全員に一斉送信
      if (cellUpdates.length > 0) {
        io.to(roomId).emit(SocketEvents.UPDATE_MAP_CELLS, cellUpdates);
      }

      // 4. 今後、プレイヤーの座標データ(UPDATE_PLAYER)もここで一括送信するように変更できます
      
    }, tickRate);

    // ループIDを保存
    this.gameLoops.set(roomId, loopId);
    console.log(`[GameLoop] Started for room: ${roomId} at ${tickRate}ms`);
  }

  /**
   * ゲームループを停止する
   */
  stopGameLoop(roomId: string) {
    const loopId = this.gameLoops.get(roomId);
    if (loopId) {
      clearInterval(loopId);
      this.gameLoops.delete(roomId);
      console.log(`[GameLoop] Stopped for room: ${roomId}`);
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