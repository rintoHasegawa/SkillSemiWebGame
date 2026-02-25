/**
 * BombManager
 * 爆弾エンティティの生成，更新，破棄を管理する
 * クールダウンと設置位置解決をまとめて扱う
 */
import type { Container } from "pixi.js";
import { config } from "@client/config";
import { LocalPlayerController } from "@client/scenes/game/entities/player/PlayerController";
import { BombController } from "@client/scenes/game/entities/bomb/BombController";
import type { GamePlayers } from "./game.types";

/** 経過時間ミリ秒を返す関数型 */
export type ElapsedMsProvider = () => number;

/** 爆弾の追加更新に使う入力データ型 */
export type BombUpsertPayload = {
  x: number;
  y: number;
  radiusGrid: number;
  explodeAtElapsedMs: number;
};

type BombManagerOptions = {
  worldContainer: Container;
  players: GamePlayers;
  myId: string;
  getElapsedMs: ElapsedMsProvider;
};

/** 爆弾エンティティのライフサイクルを管理する */
export class BombManager {
  private worldContainer: Container;
  private players: GamePlayers;
  private myId: string;
  private getElapsedMs: ElapsedMsProvider;
  private bombs = new Map<string, BombController>();
  private nextLocalBombId = 1;
  private lastBombPlacedElapsedMs = Number.NEGATIVE_INFINITY;

  constructor({ worldContainer, players, myId, getElapsedMs }: BombManagerOptions) {
    this.worldContainer = worldContainer;
    this.players = players;
    this.myId = myId;
    this.getElapsedMs = getElapsedMs;
  }

  /** 自プレイヤー位置に爆弾を設置し，生成IDを返す */
  public placeBomb(): string | null {
    const me = this.players[this.myId];
    if (!me || !(me instanceof LocalPlayerController)) return null;

    const elapsedMs = this.getElapsedMs();
    const { BOMB_COOLDOWN_MS, BOMB_FUSE_MS, BOMB_RADIUS_GRID } = config.GAME_CONFIG;
    if (elapsedMs - this.lastBombPlacedElapsedMs < BOMB_COOLDOWN_MS) {
      return null;
    }

    const position = me.getPosition();
    const payload: BombUpsertPayload = {
      x: position.x,
      y: position.y,
      radiusGrid: BOMB_RADIUS_GRID,
      explodeAtElapsedMs: elapsedMs + BOMB_FUSE_MS,
    };
    const bombId = `local-${this.nextLocalBombId}`;
    this.nextLocalBombId += 1;

    this.upsertBomb(bombId, payload);
    this.lastBombPlacedElapsedMs = elapsedMs;
    return bombId;
  }

  /** 指定IDの爆弾を追加または更新する */
  public upsertBomb(bombId: string, payload: BombUpsertPayload): void {
    const current = this.bombs.get(bombId);
    if (current) {
      this.worldContainer.removeChild(current.getDisplayObject());
      current.destroy();
    }

    const bomb = new BombController(payload);
    this.bombs.set(bombId, bomb);
    this.worldContainer.addChild(bomb.getDisplayObject());
  }

  /** 指定IDの爆弾を削除する */
  public removeBomb(bombId: string): void {
    const bomb = this.bombs.get(bombId);
    if (!bomb) return;

    this.worldContainer.removeChild(bomb.getDisplayObject());
    bomb.destroy();
    this.bombs.delete(bombId);
  }

  /** 爆弾状態を更新し終了済みを破棄する */
  public tick(): void {
    const elapsedMs = this.getElapsedMs();

    this.bombs.forEach((bomb, bombId) => {
      bomb.tick(elapsedMs);

      if (bomb.isFinished()) {
        this.removeBomb(bombId);
        return;
      }
    });
  }

  /** 管理中の爆弾をすべて破棄する */
  public destroy(): void {
    this.bombs.forEach((bomb) => bomb.destroy());
    this.bombs.clear();
  }
}
