/**
 * ActiveBombRegistry
 * サーバー側で設置済み爆弾のライフサイクルを追跡する
 * 爆発時刻に到達した爆弾を回収してBot被弾判定に利用する
 */

/** アクティブ爆弾の状態表現 */
export type ActiveBomb = {
  bombId: string;
  ownerPlayerId: string;
  x: number;
  y: number;
  explodeAtElapsedMs: number;
  ownerTeamId: number;
};

/** アクティブ爆弾レジストリの生成オプション */
export type ActiveBombRegistryOptions = {
  /** 爆発済み爆弾を回収した直後に呼ばれる通知（付随状態の解放に使う） */
  onBombsCollected?: (explodedBombs: ActiveBomb[], elapsedMs: number) => void;
};

// 登録を受け付けられる数値を持つ爆弾かを判定する
const isRegistrableBomb = (bomb: ActiveBomb): boolean => {
  return (
    Number.isFinite(bomb.x) &&
    Number.isFinite(bomb.y) &&
    Number.isFinite(bomb.explodeAtElapsedMs)
  );
};

/** 設置済み爆弾を保持し爆発済みのものを回収するレジストリ */
export class ActiveBombRegistry {
  private bombs = new Map<string, ActiveBomb>();

  constructor(private readonly options: ActiveBombRegistryOptions = {}) {}

  /**
   * 新規爆弾を登録する
   * 座標・爆発時刻が非有限の爆弾は回収条件を満たせず残留するため登録しない
   */
  public registerBomb(bomb: ActiveBomb): void {
    if (!isRegistrableBomb(bomb)) {
      return;
    }

    this.bombs.set(bomb.bombId, bomb);
  }

  /**
   * 爆発時刻に到達した爆弾を回収して返し，レジストリから除去する
   * 回収結果は onBombsCollected へ通知し，爆弾に紐づく状態の解放へつなげる
   */
  public collectExplodedBombs(elapsedMs: number): ActiveBomb[] {
    const exploded: ActiveBomb[] = [];

    this.bombs.forEach((bomb, bombId) => {
      if (elapsedMs >= bomb.explodeAtElapsedMs) {
        exploded.push(bomb);
        this.bombs.delete(bombId);
      }
    });

    this.options.onBombsCollected?.(exploded, elapsedMs);
    return exploded;
  }

  /** 登録済み爆弾をすべて破棄する */
  public clear(): void {
    this.bombs.clear();
  }

  /** 現在アクティブな爆弾のスナップショットを返す */
  public getActiveBombSnapshots(): ActiveBomb[] {
    return Array.from(this.bombs.values());
  }
}
