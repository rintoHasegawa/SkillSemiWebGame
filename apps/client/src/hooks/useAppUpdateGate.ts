/**
 * useAppUpdateGate
 * PWA の更新検出と，安全なタイミングでの更新適用を担うフック
 * 前面復帰で更新チェックを走らせ，タイトル画面の条件が揃った時点で適用する
 */
import { useEffect, useState } from "react";
import { domain } from "@repo/shared";
import {
  applyPendingUpdate,
  hasPendingAppUpdate,
  initializeAppUpdater,
  requestUpdateCheck,
  subscribeToPendingUpdate,
} from "@client/pwa/appUpdater";
import { hasReloadedForUpdateInSession } from "@client/pwa/updateSession";
import { canApplyUpdate } from "./application/appUpdateGate";

/** 更新ゲートの判定に必要な画面状態 */
export type UseAppUpdateGateParams = {
  scenePhase: domain.app.ScenePhaseType;
  /** タイトルの入力フォームが開いているか */
  isTitleFormOpen: boolean;
  /** 接続断・版不一致の通知を表示中か */
  hasConnectionNotice: boolean;
};

/** 更新検出とゲート判定を行い，条件が揃った時点で更新を適用するフック */
export const useAppUpdateGate = ({
  scenePhase,
  isTitleFormOpen,
  hasConnectionNotice,
}: UseAppUpdateGateParams): void => {
  const [hasPendingUpdate, setHasPendingUpdate] = useState(hasPendingAppUpdate);

  // Service Worker の登録と更新検出の購読を行う（登録自体はモジュール側で 1 回に制限）
  useEffect(() => {
    initializeAppUpdater();
    setHasPendingUpdate(hasPendingAppUpdate());

    return subscribeToPendingUpdate(() => {
      setHasPendingUpdate(true);
    });
  }, []);

  // アプリが前面へ戻った時点で更新チェックを走らせる
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void requestUpdateCheck();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // ゲート条件が成立した瞬間に保留中の更新を適用する
  useEffect(() => {
    const isApplicable = canApplyUpdate({
      scenePhase,
      isTitleFormOpen,
      hasConnectionNotice,
      hasPendingUpdate,
      hasReloadedInSession: hasReloadedForUpdateInSession(),
    });

    if (!isApplicable) {
      return;
    }

    applyPendingUpdate();
  }, [scenePhase, isTitleFormOpen, hasConnectionNotice, hasPendingUpdate]);
};

/** 更新適用の可否を判定する純関数を再公開 */
export { canApplyUpdate } from "./application/appUpdateGate";
/** 更新適用の可否判定に必要な状態型を再公開 */
export type { AppUpdateGateState } from "./application/appUpdateGate";
