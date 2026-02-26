/**
 * BombStep
 * ゲームループの爆弾更新段を担う
 * 爆弾エンティティの時間更新と状態遷移を実行する
 */
import { BombManager } from "@client/scenes/game/entities/bomb/BombManager";
import type { LoopFrameContext, LoopStep } from "./LoopStep";

/** BombStep の初期化入力 */
type BombStepOptions = {
  bombManager: BombManager;
};

/** 爆弾更新処理を担うステップ */
export class BombStep implements LoopStep {
  private bombManager: BombManager;

  constructor({ bombManager }: BombStepOptions) {
    this.bombManager = bombManager;
  }

  /** 爆弾更新を実行する，時間管理は GameTimer 由来の経過時刻を利用する */
  public run(_context: LoopFrameContext): void {
    this.bombManager.tick();
  }
}
