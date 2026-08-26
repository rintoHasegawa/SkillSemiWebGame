/**
 * chunkLoadRecovery
 * 遅延チャンク（動的 import）の取得失敗を捕捉して自動復旧を開始するモジュール
 * 再デプロイでハッシュ付きチャンクが 404 になったページを，最新の成果物で
 * 読み直させることで復帰させる
 */
import { hasRecoveredFromChunkErrorInSession } from "./updateSession";
import { recoverFromChunkLoadFailure } from "./appUpdater";

// 同一ページ内で復旧を開始済みかを保持する（複数チャンクが同時に失敗するため）
let isRecoveryStarted = false;

/**
 * `vite:preloadError` を受け取り，復旧を開始できる場合のみ既定動作を止める
 * 既定動作を止めなかった場合は Vite 側が元のエラーを再スローし，
 * 既存のエラー表示（GameInitErrorOverlay 等）へ落ちる
 *
 * なお Vite の `handlePreloadError` は `preventDefault()` されると再スローしないため，
 * 動的 import の Promise は reject せず `undefined` で解決する
 * 直後に復旧リロードへ入るため実害は無いが，戻り値を前提にした処理は書けない
 */
export const handleChunkPreloadError = (event: Event): void => {
  // 開始済みの復旧に任せ，2 件目以降のエラーを重ねて表示しない
  if (isRecoveryStarted) {
    event.preventDefault();
    return;
  }

  // 前回の復旧でも解消しなかったため，今回はエラー表示へフォールバックする
  if (hasRecoveredFromChunkErrorInSession()) {
    return;
  }

  // preventDefault は同期に呼ぶ必要があるため，復旧の完了を待たずに止める
  isRecoveryStarted = true;
  event.preventDefault();

  // 復旧に入れなかった場合はフラグを戻し，次のエラーをエラー表示へ落とす
  // 復旧開始時にセッションキーは記録済みのため，戻しても復旧は二重に走らず，
  // 次回は分岐 2 に落ちて preventDefault されないままエラーが再スローされる
  // 復旧が進行中（リロード待ち）の間は true のままなので重複表示は防がれる
  void recoverFromChunkLoadFailure()
    .then((isRecovering) => {
      if (!isRecovering) {
        isRecoveryStarted = false;
      }
    })
    .catch((error: unknown) => {
      isRecoveryStarted = false;
      console.error(
        "[chunkLoadRecovery] チャンク取得失敗の復旧に失敗しました",
        error,
      );
    });
};

/** `vite:preloadError` の購読を開始し，解除関数を返す */
export const registerChunkPreloadErrorHandler = (): (() => void) => {
  window.addEventListener("vite:preloadError", handleChunkPreloadError);

  return () => {
    window.removeEventListener("vite:preloadError", handleChunkPreloadError);
  };
};
