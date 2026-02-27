/**
 * Player
 * サーバー側で保持するプレイヤー状態モデルを定義する
 */
import { domain } from "@repo/shared";

export class Player implements domain.player.PlayerData {
  public id: string;
  public name: string;
  public ownerType: domain.player.PlayerOwnerType;
  public x: number = 0;
  public y: number = 0;
  public teamId: number;

  // 💡 コンストラクタで teamId を受け取るように変更
  constructor(
    id: string,
    name: string,
    teamId: number,
    ownerType: domain.player.PlayerOwnerType,
  ) {
    this.id = id;
    this.name = name;
    this.teamId = teamId;
    this.ownerType = ownerType;
  }
}
