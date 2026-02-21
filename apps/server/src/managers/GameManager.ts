import { Player } from "../entities/Player.js";

// プレイヤー集合の生成・更新・参照管理クラス
export class GameManager {
  private players: Map<string, Player>;

  constructor() {
    this.players = new Map();
  }

  // 新規プレイヤー登録と初期位置設定処理
  addPlayer(id: string): Player {
    const player = new Player(id);
    
    // 初期スポーン位置
    player.x = 1000;
    player.y = 1000;
    
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
}