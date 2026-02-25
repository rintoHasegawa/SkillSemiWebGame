/**
 * BombManager
 * 爆弾エンティティの生成，更新，破棄を管理する
 * クールダウンと設置位置解決をまとめて扱う
 */
import type { Container } from "pixi.js";
import { config } from "@repo/shared";
import { LocalPlayerController } from "@client/scenes/game/entities/player/PlayerController";
import { BombController } from "@client/scenes/game/entities/bomb/BombController";
import type { GamePlayers } from "./game.types";

type BombManagerOptions = {
  worldContainer: Container;
  players: GamePlayers;
  myId: string;
  getElapsedMs: () => number;
};

/** 爆弾エンティティのライフサイクルを管理する */
export class BombManager {
  private worldContainer: Container;
  private players: GamePlayers;
  private myId: string;
  private getElapsedMs: () => number;
  private bombs: BombController[] = [];
  private lastBombPlacedElapsedMs = Number.NEGATIVE_INFINITY;

  constructor({ worldContainer, players, myId, getElapsedMs }: BombManagerOptions) {
    this.worldContainer = worldContainer;
    this.players = players;
    this.myId = myId;
    this.getElapsedMs = getElapsedMs;
  }

  /** 自プレイヤー位置に爆弾を設置する */
  public placeBomb(): void {
    const me = this.players[this.myId];
    if (!me || !(me instanceof LocalPlayerController)) return;

    const elapsedMs = this.getElapsedMs();
    const { BOMB_COOLDOWN_MS, BOMB_FUSE_MS, BOMB_RADIUS_GRID } = config.GAME_CONFIG;
    if (elapsedMs - this.lastBombPlacedElapsedMs < BOMB_COOLDOWN_MS) {
      return;
    }

    const position = me.getPosition();
    const bomb = new BombController({
      x: position.x,
      y: position.y,
      radiusGrid: BOMB_RADIUS_GRID,
      explodeAtElapsedMs: elapsedMs + BOMB_FUSE_MS,
    });

    this.bombs.push(bomb);
    this.worldContainer.addChild(bomb.getDisplayObject());
    this.lastBombPlacedElapsedMs = elapsedMs;
  }

  /** 爆弾状態を更新し終了済みを破棄する */
  public tick(): void {
    const elapsedMs = this.getElapsedMs();

    const nextBombs: BombController[] = [];
    this.bombs.forEach((bomb) => {
      bomb.tick(elapsedMs);

      if (bomb.isFinished()) {
        this.worldContainer.removeChild(bomb.getDisplayObject());
        bomb.destroy();
        return;
      }

      nextBombs.push(bomb);
    });

    this.bombs = nextBombs;
  }

  /** 管理中の爆弾をすべて破棄する */
  public destroy(): void {
    this.bombs.forEach((bomb) => bomb.destroy());
    this.bombs = [];
  }
}
