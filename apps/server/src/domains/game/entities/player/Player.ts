/**
 * Player
 * サーバー側で保持するプレイヤー状態モデルを定義する
 */
import { domain } from "@repo/shared";

export class Player implements domain.game.player.PlayerData {
  public id: string;
  public name: string;
  public x: number = 0;
  public y: number = 0;
  public teamId: number;

  /** セルの色を塗り替えた回数 */
  public paintCount: number = 0;
  /** 爆弾を敵に当てた回数 */
  public bombHitCount: number = 0;

  // 💡 コンストラクタで teamId を受け取るように変更
  constructor(id: string, name: string, teamId: number) {
    this.id = id;
    this.name = name;
    this.teamId = teamId;
  }
}
