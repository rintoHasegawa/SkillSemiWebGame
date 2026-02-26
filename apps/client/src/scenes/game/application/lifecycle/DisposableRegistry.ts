/**
 * DisposableRegistry
 * 破棄処理を登録して一括実行する
 * 登録順の逆順で実行して依存順の安全なクリーンアップを行う
 */

/** 後始末として実行する破棄処理の関数型 */
export type Disposer = () => void;

/** 破棄処理の登録と一括実行を管理するレジストリ */
export class DisposableRegistry {
  private disposers: Disposer[] = [];

  /** 破棄処理を登録し登録解除関数を返す */
  public add(disposer: Disposer): () => void {
    this.disposers.push(disposer);

    return () => {
      this.disposers = this.disposers.filter((target) => target !== disposer);
    };
  }

  /** 登録済み破棄処理を逆順で実行して登録をクリアする */
  public disposeAll(): void {
    for (let index = this.disposers.length - 1; index >= 0; index -= 1) {
      this.disposers[index]();
    }

    this.disposers = [];
  }

  /** 破棄処理を実行せず登録のみをクリアする */
  public clear(): void {
    this.disposers = [];
  }
}