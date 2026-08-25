/**
 * updateSession
 * 更新適用によるリロードをセッション内で 1 回に制限するための記録を扱う
 * sessionStorage が使えない環境でもアプリを止めないようフォールバックする
 */

/** 保留中の更新を適用してリロードしたことを記録するキー */
export const UPDATE_RELOAD_SESSION_KEY = "ppw:app-update-reloaded";

/** プロトコル版不一致からの復旧リロードを実施したことを記録するキー */
export const PROTOCOL_RECOVERY_RELOAD_SESSION_KEY =
  "ppw:protocol-recovery-reloaded";

/** 指定キーがこのセッションで記録済みかを判定する（参照できない環境では false） */
export const hasSessionMark = (key: string): boolean => {
  try {
    return globalThis.sessionStorage.getItem(key) !== null;
  } catch {
    // プライベートモード等で参照できない場合はリロード済みでない扱いにする
    return false;
  }
};

/** 指定キーをこのセッションの実施済みとして記録する（保存失敗時も継続する） */
export const markSession = (key: string): void => {
  try {
    globalThis.sessionStorage.setItem(key, "1");
  } catch (error) {
    console.error("[updateSession] セッション記録の保存に失敗しました", error);
  }
};

/** このセッションで更新適用によるリロードを実施済みかを判定する */
export const hasReloadedForUpdateInSession = (): boolean => {
  return hasSessionMark(UPDATE_RELOAD_SESSION_KEY);
};

/** このセッションでプロトコル版不一致の復旧を試行済みかを判定する */
export const hasRecoveredFromProtocolMismatchInSession = (): boolean => {
  return hasSessionMark(PROTOCOL_RECOVERY_RELOAD_SESSION_KEY);
};
