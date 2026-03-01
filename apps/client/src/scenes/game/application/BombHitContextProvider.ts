/**
 * BombHitContextProvider
 * 爆弾当たり判定で利用するローカルプレイヤー情報を供給する
 * プレイヤー管理構造から最小の判定DTOへ変換して返す
 */
import { config } from "@client/config";
import type { domain } from "@repo/shared";

type TeamCollisionCircle = domain.game.bombHit.TeamCollisionCircle;
import type { GamePlayers } from "./game.types";

/** 被弾判定と報告に利用するプレイヤー円情報 */
export type ReportablePlayerCircle = TeamCollisionCircle & {
  playerId: string;
};

/** 判定用コンテキスト供給クラスの初期化入力 */
type BombHitContextProviderOptions = {
  players: GamePlayers;
  myId: string;
};

/** 爆弾当たり判定に必要なローカルプレイヤー情報を返す */
export class BombHitContextProvider {
  private players: GamePlayers;
  private myId: string;

  constructor({ players, myId }: BombHitContextProviderOptions) {
    this.players = players;
    this.myId = myId;
  }

  /** 自プレイヤーの被弾判定用円情報を取得する（不在ならnull） */
  public getLocalReportableCircle(): ReportablePlayerCircle | null {
    const me = this.players[this.myId];
    if (!me) return null;

    const position = me.getPosition();
    const snapshot = me.getSnapshot();

    return {
      playerId: this.myId,
      x: position.x,
      y: position.y,
      radius: config.GAME_CONFIG.PLAYER_RADIUS,
      teamId: snapshot.teamId,
    };
  }
}
