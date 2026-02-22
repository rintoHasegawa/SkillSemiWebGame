import { Player } from "../entities/Player.js";
import { GAME_CONFIG } from "@repo/shared/src/config/gameConfig";
import { MapStore } from "../states/MapStore";
import { getGridIndexFromPosition } from "@repo/shared/src/domains/gridMap/gridMap.logic";
import type { CellUpdate } from "@repo/shared/src/domains/gridMap/gridMap.type";

// プレイヤー集合の生成・更新・参照管理クラス
export class GameManager {
  private players: Map<string, Player>;
  private mapStore: MapStore;

  constructor() {
    this.players = new Map();
    this.mapStore = new MapStore();
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