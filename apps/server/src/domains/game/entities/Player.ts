import type { PlayerData } from "@repo/shared";
import { GAME_CONFIG } from "@repo/shared";

// サーバー側保持プレイヤー状態モデル
export class Player implements PlayerData {
  public id: string;
  public x: number = 0;
  public y: number = 0;
  public teamId: number;

  constructor(id: string) {
    this.id = id;
    
    // GAME_CONFIGからチーム数を動的に取得して割り当て
    const teamCount = GAME_CONFIG.TEAM_COLORS.length;
    this.teamId = Math.floor(Math.random() * teamCount);
  }
}