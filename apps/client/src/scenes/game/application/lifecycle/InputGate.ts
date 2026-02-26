/**
 * InputGate
 * ゲーム入力の受付可否と入力ロック状態を管理する
 * 開始状態とロック状態を組み合わせて入力可否を判定する
 */

/** ジョイスティック入力の座標を表す型 */
export type JoystickInput = {
  x: number;
  y: number;
};

/** InputGate の初期化入力 */
export type InputGateOptions = {
  isStartedProvider: () => boolean;
};

/** ゲーム入力の受付可否とロック状態を管理する */
export class InputGate {
  private readonly isStartedProvider: () => boolean;
  private inputLockCount = 0;

  constructor({ isStartedProvider }: InputGateOptions) {
    this.isStartedProvider = isStartedProvider;
  }

  /** 現在入力を受け付け可能かを返す */
  public canAcceptInput(): boolean {
    return this.inputLockCount === 0 && this.isStartedProvider();
  }

  /** 入力ロックを取得し，解除関数を返す */
  public lockInput(): () => void {
    this.inputLockCount += 1;

    let released = false;
    return () => {
      if (released) {
        return;
      }

      released = true;
      this.inputLockCount = Math.max(0, this.inputLockCount - 1);
    };
  }

  /** 入力可否に応じてジョイスティック入力を正規化して返す */
  public sanitizeJoystickInput(input: JoystickInput): JoystickInput {
    if (!this.canAcceptInput()) {
      return { x: 0, y: 0 };
    }

    return input;
  }

  /** 管理状態を初期化する */
  public reset(): void {
    this.inputLockCount = 0;
  }
}