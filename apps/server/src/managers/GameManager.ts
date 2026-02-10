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
    this.players.set(id, player);
    return player;
  }

  // プレイヤー削除
  removePlayer(id: string) {
    this.players.delete(id);
  }

  // プレイヤー移動
  movePlayer(id: string, x: number, y: number) {
    const player = this.players.get(id);
    if (player) {
      const spped = 3 // 移動速度
      player.x += x * spped;
      player.y += y * spped;
      
      console.log(`ID:${id.slice(0, 4)} 📍 (${Math.floor(player.x)}, ${Math.floor(player.y)})`); 
    }
  }

  // 全プレイヤーのリストを返す（通信で送るため）
  getAllPlayers() {
    // Mapを配列({id, x, y, color}[])に変換
    return Array.from(this.players.values());
  }
}