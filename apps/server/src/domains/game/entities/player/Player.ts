import type { playerTypes } from "@repo/shared";
import { config } from "@repo/shared";

// サーバー側保持プレイヤー状態モデル
export class Player implements playerTypes.PlayerData {
  public id: string;
  public x: number = 0;
  public y: number = 0;
  public teamId: number;

  constructor(id: string) {
    this.id = id;
    
    // GAME_CONFIGからチーム数を動的に取得して割り当て
    const teamCount = config.GAME_CONFIG.TEAM_COLORS.length;
    this.teamId = Math.floor(Math.random() * teamCount);
  }
}