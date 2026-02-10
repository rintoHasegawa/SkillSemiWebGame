// src/managers/GameManager.ts
import { Player } from "../entities/Player.js";

export class GameManager {
  // IDをキーにしてプレイヤーを保存する
  private players: Map<string, Player>;

  constructor() {
    this.players = new Map();
  }

  // プレイヤー追加
  addPlayer(id: string): Player {
    const player = new Player(id);
    player.x = 150; // 初期位置
    player.y = 150;
    this.players.set(id, player);
    return player;
  }

  // プレイヤー削除
  removePlayer(id: string) {
    this.players.delete(id);
  }
  // プレイヤー情報を取得
  getPlayer(id: string) {
    return this.players.get(id);
  }
  // プレイヤー移動
  movePlayer(id: string, x: number, y: number) {
    const player = this.players.get(id);
    if (player) {
      
      // ▼▼▼ デバッグ用ログ（何が送られてきてるか犯人探し） ▼▼▼
      // これでターミナルに "Move: x=null" とか出たら通信の問題です
      console.log(`Move Request -> ID:${id.slice(0,4)} x:${x} y:${y}`);

      
      if (typeof x !== "number" || typeof y !== "number" || isNaN(x) || isNaN(y)) {
        console.log("⚠️ 無効なデータなので無視しました");
        return;
      }
      

      const speed = 10.0; // スピード

      player.x += x * speed;
      player.y -= y * speed;

      // 画面端の制限
      if (player.x < 0) player.x = 0;
      if (player.x > 300) player.x = 300;
      if (player.y < 0) player.y = 0;
      if (player.y > 300) player.y = 300;
    }
  }

  // 全プレイヤーのリストを返す（通信で送るため）
  getAllPlayers() {
    // Mapを配列({id, x, y, color}[])に変換
    return Array.from(this.players.values());
  }
}