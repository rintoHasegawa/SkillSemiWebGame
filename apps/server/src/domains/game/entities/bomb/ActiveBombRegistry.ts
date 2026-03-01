/**
 * ActiveBombRegistry
 * サーバー側で設置済み爆弾のライフサイクルを追跡する
 * 爆発時刻に到達した爆弾を回収してBot被弾判定に利用する
 */

/** アクティブ爆弾の状態表現 */
export type ActiveBomb = {
  bombId: string;
  x: number;
  y: number;
  explodeAtElapsedMs: number;
  ownerTeamId: number;
};

/** 設置済み爆弾を保持し爆発済みのものを回収するレジストリ */
export class ActiveBombRegistry {
  private bombs = new Map<string, ActiveBomb>();

  /** 新規爆弾を登録する */
  public registerBomb(bomb: ActiveBomb): void {
    this.bombs.set(bomb.bombId, bomb);
  }

  /** 爆発時刻に到達した爆弾を回収して返し，レジストリから除去する */
  public collectExplodedBombs(elapsedMs: number): ActiveBomb[] {
    const exploded: ActiveBomb[] = [];

    this.bombs.forEach((bomb, bombId) => {
      if (elapsedMs >= bomb.explodeAtElapsedMs) {
        exploded.push(bomb);
        this.bombs.delete(bombId);
      }
    });

    return exploded;
  }

  /** 登録済み爆弾をすべて破棄する */
  public clear(): void {
    this.bombs.clear();
  }
}
