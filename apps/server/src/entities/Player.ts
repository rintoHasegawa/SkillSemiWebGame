import type { PlayerData } from "@repo/shared/src/types/player";

export class Player implements PlayerData {
  public id: string;
  public x: number = 0;
  public y: number = 0;
  public teamId: number;

  constructor(id: string) {
    this.id = id;
    
    // 0〜3のランダムなチームIDを割り当てる
    // (4チーム制を想定し、Math.randomで一旦仮実装)
    this.teamId = Math.floor(Math.random() * 4);
  }
}