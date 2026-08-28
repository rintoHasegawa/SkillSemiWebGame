/**
 * runGameSceneInit
 * ゲームシーン初期化の実行結果を判別可能ユニオンへ変換する薄いラッパ
 * 失敗を例外として伝播させず，呼び出し側が分岐できる形で返す
 */

/** ゲームシーン初期化の実行結果を表す判別可能ユニオン */
export type GameSceneInitResult =
  | { status: "initialized" }
  | { status: "failed"; error: unknown }
  | { status: "aborted" };

/** 初期化実行結果のステータス値 */
export const GameSceneInitResultStatus = {
  INITIALIZED: "initialized",
  FAILED: "failed",
  ABORTED: "aborted",
} as const;

/** 初期化実行の入力型 */
export type RunGameSceneInitParams = {
  init: () => Promise<void>;
  isDisposed: () => boolean;
};

/** ゲームシーン初期化を実行し，結果を必ず resolve で返す */
export const runGameSceneInit = async (
  params: RunGameSceneInitParams,
): Promise<GameSceneInitResult> => {
  try {
    await params.init();
  } catch (error) {
    // 破棄済みなら失敗として扱わず中断結果を返す（結果の到着が遅れた場合）
    if (params.isDisposed()) {
      return { status: GameSceneInitResultStatus.ABORTED };
    }

    return { status: GameSceneInitResultStatus.FAILED, error };
  }

  // 成功時も await 後に破棄状態を判定し，破棄済みなら結果を捨てる
  if (params.isDisposed()) {
    return { status: GameSceneInitResultStatus.ABORTED };
  }

  return { status: GameSceneInitResultStatus.INITIALIZED };
};
