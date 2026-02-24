/**
 * Player
 * サーバー側で保持するプレイヤー状態モデルを定義する
 */
import type { playerTypes } from "@repo/shared";
import { config } from "@repo/shared";

// サーバー側保持プレイヤー状態モデル
/** サーバー側プレイヤー座標と所属チームを保持するエンティティ */
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