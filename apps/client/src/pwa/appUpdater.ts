/**
 * appUpdater
 * Service Worker の更新検出と適用を扱うモジュール
 * 登録・更新チェック・保留中更新の保持を集約し，リロードの実行タイミングは呼び出し側に委ねる
 */
import { registerSW } from "virtual:pwa-register";
import {
  hasRecoveredFromProtocolMismatchInSession,
  markSession,
  PROTOCOL_RECOVERY_RELOAD_SESSION_KEY,
  UPDATE_RELOAD_SESSION_KEY,
} from "./updateSession";

// React StrictMode の二重実行でも登録が重複しないようモジュールスコープで状態を保持する
let isRegistered = false;
let swRegistration: ServiceWorkerRegistration | null = null;
let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null =
  null;
let hasPendingUpdate = false;
const pendingUpdateListeners = new Set<() => void>();

// 新しい版が待機状態になったことを購読者へ通知する
const notifyPendingUpdate = (): void => {
  hasPendingUpdate = true;
  pendingUpdateListeners.forEach((listener) => {
    listener();
  });
};

/** Service Worker を登録して更新検出を開始する（多重呼び出しは無視される） */
export const initializeAppUpdater = (): void => {
  if (isRegistered) {
    return;
  }

  isRegistered = true;

  updateServiceWorker = registerSW({
    immediate: true,
    onRegisteredSW: (
      _swScriptUrl: string,
      registration: ServiceWorkerRegistration | undefined,
    ) => {
      swRegistration = registration ?? null;
    },
    onNeedRefresh: () => {
      // prompt モードのため待機状態に留まる．適用の可否はゲート側で判断する
      notifyPendingUpdate();
    },
    onRegisterError: (error: unknown) => {
      console.error("[appUpdater] Service Worker の登録に失敗しました", error);
    },
  });
};

/** 待機中の更新があるかを返す */
export const hasPendingAppUpdate = (): boolean => {
  return hasPendingUpdate;
};

/** 更新検出の通知を購読し，解除関数を返す */
export const subscribeToPendingUpdate = (listener: () => void): (() => void) => {
  pendingUpdateListeners.add(listener);

  return () => {
    pendingUpdateListeners.delete(listener);
  };
};

/** サーバ上の Service Worker を確認して新しい版の有無を調べる */
export const requestUpdateCheck = async (): Promise<void> => {
  if (swRegistration === null) {
    return;
  }

  try {
    await swRegistration.update();
  } catch (error) {
    // 通信断・一時的な失敗は次回の復帰契機で再試行すればよい
    console.error("[appUpdater] 更新チェックに失敗しました", error);
  }
};

/** 待機中の更新を適用する（適用を開始できたかを返す） */
export const applyPendingUpdate = (): boolean => {
  if (!hasPendingUpdate || updateServiceWorker === null) {
    return false;
  }

  // リロードを 1 セッション 1 回に制限するため，適用の開始時点で記録する
  markSession(UPDATE_RELOAD_SESSION_KEY);

  // skipWaiting の完了後に vite-plugin-pwa 側がページをリロードする
  void updateServiceWorker(true).catch((error: unknown) => {
    console.error("[appUpdater] 更新の適用に失敗しました", error);
  });

  return true;
};

/**
 * プロトコル版不一致からの自動復旧を試みる
 * 復旧動作（更新適用またはリロード）を開始した場合に true を返す
 */
export const recoverFromProtocolVersionMismatch = async (): Promise<boolean> => {
  if (hasRecoveredFromProtocolMismatchInSession()) {
    // 既に一度試して解消しなかったため，呼び出し側でメッセージ表示へフォールバックする
    return false;
  }

  markSession(PROTOCOL_RECOVERY_RELOAD_SESSION_KEY);

  await requestUpdateCheck();

  if (applyPendingUpdate()) {
    return true;
  }

  // 新しい版が見つからない場合も，取得済みバンドルの再読込で解消する可能性に賭ける
  window.location.reload();
  return true;
};
