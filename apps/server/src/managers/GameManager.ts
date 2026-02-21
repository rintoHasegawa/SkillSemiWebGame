import { Player } from "../entities/Player.js";

export class GameManager {
  private players: Map<string, Player>;

  constructor() {
    this.players = new Map();
  }

  // プレイヤー追加
  addPlayer(id: string): Player {
    const player = new Player(id);
    
    // ★初期位置をマップの中央（1000, 1000）に設定
    player.x = 1000;
    player.y = 1000;
    
    this.players.set(id, player);
    return player;
  }

  // プレイヤー削除
  removePlayer(id: string) {
    this.players.delete(id);
  }

  // プレイヤー取得
  getPlayer(id: string) {
    return this.players.get(id);
  }

  // プレイヤー移動
  movePlayer(id: string, x: number, y: number) {
    const player = this.players.get(id);
    if (player) {
      
      // ▼▼▼ リクエスト通り、ログを残しました ▼▼▼
      // これでサーバーのターミナルを見れば、座標が届いているかわかります
      console.log(`Move Request -> ID:${id.slice(0,4)} x:${Math.round(x)} y:${Math.round(y)}`);

      // データチェック
      if (typeof x !== "number" || typeof y !== "number" || isNaN(x) || isNaN(y)) {
        console.log("⚠️ 無効なデータなので無視しました");
        return;
      }

      // ★重要修正★
      // クライアント側で計算済みの座標(x, y)が送られてくるので、
      // ここで speed を掛けたり、+= で足したりしてはいけません。
      // そのまま「代入」するのが正解です。
      player.x = x;
      player.y = y;
    }
  }

  // 全プレイヤー情報を返す
  getAllPlayers() {
    return Array.from(this.players.values());
  }
}