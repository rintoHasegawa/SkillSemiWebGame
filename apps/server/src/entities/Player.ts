import type { PlayerData } from "@repo/shared/src/types/player";

// サーバー側保持プレイヤー状態モデル
export class Player implements PlayerData {
  public id: string;
  public x: number = 0;
  public y: number = 0;
  public teamId: number;

  constructor(id: string) {
    this.id = id;
    
    // 0〜3 範囲ランダムチームID割り当て
    this.teamId = Math.floor(Math.random() * 4);
  }
}