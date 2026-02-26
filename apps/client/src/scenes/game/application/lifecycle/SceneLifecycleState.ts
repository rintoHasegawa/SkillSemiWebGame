/**
 * SceneLifecycleState
 * ゲームシーンの初期化状態と破棄状態を管理する
 * init と destroy の分岐判定を一元化する
 */

/** ゲームシーンのライフサイクル状態を管理する */
export class SceneLifecycleState {
  private isInitialized = false;
  private isDestroyed = false;

  /** 初期化完了前に破棄要求があったかを返す */
  public shouldAbortInit(): boolean {
    return this.isDestroyed;
  }

  /** 初期化完了を記録する */
  public markInitialized(): void {
    this.isInitialized = true;
  }

  /** 破棄要求を記録する */
  public markDestroyed(): void {
    this.isDestroyed = true;
  }

  /** 破棄処理で Pixi を破棄すべきかを返す */
  public shouldDestroyApp(): boolean {
    return this.isInitialized;
  }
}