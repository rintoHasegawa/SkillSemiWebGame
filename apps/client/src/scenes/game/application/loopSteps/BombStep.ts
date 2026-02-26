/**
 * BombStep
 * ゲームループの爆弾更新段を担う
 * 爆弾エンティティの時間更新と状態遷移を実行する
 */
import { BombManager } from "@client/scenes/game/entities/bomb/BombManager";

/** BombStep の初期化入力 */
type BombStepOptions = {
  bombManager: BombManager;
};

/** 爆弾更新処理を担うステップ */
export class BombStep {
  private bombManager: BombManager;

  constructor({ bombManager }: BombStepOptions) {
    this.bombManager = bombManager;
  }

  /** 爆弾更新を実行する */
  public run(): void {
    this.bombManager.tick();
  }
}
