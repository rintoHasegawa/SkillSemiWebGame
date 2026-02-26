/**
 * Player
 * サーバー側で保持するプレイヤー状態モデルを定義する
 */
import type { playerTypes } from "@repo/shared";
// configのimportは不要になります

export class Player implements playerTypes.PlayerData {
  public id: string;
  public name: string;
  public x: number = 0;
  public y: number = 0;
  public teamId: number;

  // 💡 コンストラクタで teamId を受け取るように変更
  constructor(id: string, name: string, teamId: number) {
    this.id = id;
    this.name = name;
    this.teamId = teamId;
  }
}
