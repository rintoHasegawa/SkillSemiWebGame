/**
 * PlayerRepository
 * プレイヤー集合の更新窓口を提供する
 * 参照と更新を集約して副作用の追跡を容易にする
 */
import type {
  GamePlayerController,
  GamePlayers,
} from "@client/scenes/game/application/game.types";

/** プレイヤー集合の更新と参照を管理するリポジトリ */
export class PlayerRepository {
  private readonly players: GamePlayers;

  constructor(players: GamePlayers = {}) {
    this.players = players;
  }

  /** プレイヤーIDでコントローラーを取得する */
  public getById(playerId: string): GamePlayerController | undefined {
    return this.players[playerId];
  }

  /** プレイヤーを追加または更新する */
  public upsert(playerId: string, controller: GamePlayerController): void {
    this.players[playerId] = controller;
  }

  /** プレイヤーを削除して削除対象を返す */
  public remove(playerId: string): GamePlayerController | undefined {
    const target = this.players[playerId];
    if (!target) {
      return undefined;
    }

    delete this.players[playerId];
    return target;
  }

  /** 管理中プレイヤー配列を返す */
  public values(): GamePlayerController[] {
    return Object.values(this.players);
  }

  /** 内部で保持するプレイヤー集合を返す */
  public toRecord(): GamePlayers {
    return this.players;
  }
}