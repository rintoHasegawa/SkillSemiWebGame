/**
 * BombRuntimeSystem
 * 爆弾状態の時間更新と終了判定を処理する
 * 爆発遷移時に外部通知イベントを発火する
 */
import { BombRepository } from "./BombRepository";

/** 爆発時に外部通知するイベント型 */
export type BombExplodedEvent = {
  bombId: string;
  x: number;
  y: number;
  radius: number;
  teamId: number;
};

/** BombRuntimeSystem の初期化入力 */
export type BombRuntimeSystemOptions = {
  bombRepository: BombRepository;
  onBombExploded?: (payload: BombExplodedEvent) => void;
};

/** 爆弾の時間更新と状態遷移を管理する */
export class BombRuntimeSystem {
  private readonly bombRepository: BombRepository;
  private readonly onBombExploded?: (payload: BombExplodedEvent) => void;

  constructor({ bombRepository, onBombExploded }: BombRuntimeSystemOptions) {
    this.bombRepository = bombRepository;
    this.onBombExploded = onBombExploded;
  }

  /** 経過時間を用いて爆弾状態を更新する */
  public tick(elapsedMs: number): void {
    this.bombRepository.forEachBomb((bomb, bombId) => {
      const previousState = bomb.getState();
      bomb.updateState(elapsedMs);

      if (bomb.getDisplayObject().visible) {
        bomb.render(elapsedMs);
      }

      if (previousState !== "exploded" && bomb.getState() === "exploded") {
        const position = bomb.getPosition();
        this.onBombExploded?.({
          bombId,
          x: position.x,
          y: position.y,
          radius: bomb.getExplosionRadiusGrid(),
          teamId: bomb.getTeamId(),
        });
      }

      if (bomb.isFinished()) {
        this.bombRepository.removeBomb(bombId);
      }
    });
  }
}