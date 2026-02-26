/**
 * BombHitContextProvider
 * 爆弾当たり判定で利用するローカルプレイヤー情報を供給する
 * プレイヤー管理構造から最小の判定DTOへ変換して返す
 */
import { config } from "@client/config";
import { LocalPlayerController } from "@client/scenes/game/entities/player/PlayerController";
import type { TeamCollisionCircle } from "@client/scenes/game/entities/bomb/BombHitDetector";
import type { GamePlayers } from "./game.types";

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

  /** ローカルプレイヤーの判定用DTOを取得する */
  public getLocalPlayerCircle(): TeamCollisionCircle | null {
    const me = this.players[this.myId];
    if (!me || !(me instanceof LocalPlayerController)) {
      return null;
    }

    const position = me.getPosition();
    const snapshot = me.getSnapshot();

    return {
      x: position.x,
      y: position.y,
      radius: config.GAME_CONFIG.PLAYER_RADIUS,
      teamId: snapshot.teamId,
    };
  }
}
