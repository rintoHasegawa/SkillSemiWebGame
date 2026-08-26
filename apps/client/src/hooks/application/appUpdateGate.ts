/**
 * appUpdateGate
 * 保留中のアプリ更新を適用してよい状況かを判定する純ロジック
 * 画面状態を引数で受け取り，副作用を持たない
 */
import { domain } from "@repo/shared";

/** 更新適用の可否判定に必要な状態 */
export type AppUpdateGateState = {
  scenePhase: domain.app.ScenePhaseType;
  /** タイトルの入力フォームが開いているか（TAP TO START 後） */
  isTitleFormOpen: boolean;
  /** 接続断・版不一致の通知を表示中か */
  hasConnectionNotice: boolean;
  /** 適用待ちの更新があるか */
  hasPendingUpdate: boolean;
  /** このセッションで既に更新適用のリロードを行ったか */
  hasReloadedInSession: boolean;
};

/** 保留中の更新を今すぐ適用してよいかを判定する */
export const canApplyUpdate = ({
  scenePhase,
  isTitleFormOpen,
  hasConnectionNotice,
  hasPendingUpdate,
  hasReloadedInSession,
}: AppUpdateGateState): boolean => {
  if (!hasPendingUpdate) {
    return false;
  }

  // リロードの繰り返しでプレイ不能になることを防ぐため 1 セッション 1 回に限る
  if (hasReloadedInSession) {
    return false;
  }

  // ロビー・ゲーム中はセッションが切れる
  // リザルトは試合結果がメモリ上（appFlow.gameResult）にしか無くリロードで消える
  if (scenePhase !== domain.app.ScenePhase.TITLE) {
    return false;
  }

  // 入力中・参加要求中・参加失敗表示中をまとめて除外する
  if (isTitleFormOpen) {
    return false;
  }

  // 通信断の通知（#342）を消してしまうとプレイヤーが状況を理解できない
  if (hasConnectionNotice) {
    return false;
  }

  return true;
};
