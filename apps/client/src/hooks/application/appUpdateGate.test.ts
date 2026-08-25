/**
 * appUpdateGate.test
 * 保留中のアプリ更新を適用してよい状況かの判定仕様を検証する
 * タイトル画面かつ操作・通知を妨げない状況に限って適用されること，
 * および 1 セッション 1 回の制限（Issue #368 受け入れ条件）を対象とする
 */
import { describe, expect, it } from "vitest";

import { domain } from "@repo/shared";

import { canApplyUpdate, type AppUpdateGateState } from "./appUpdateGate";

/** 更新を適用してよい状況（タイトル・フォーム未展開・通知なし・更新あり・未リロード） */
const createApplicableState = (
  overrides: Partial<AppUpdateGateState> = {},
): AppUpdateGateState => {
  return {
    scenePhase: domain.app.ScenePhase.TITLE,
    isTitleFormOpen: false,
    hasConnectionNotice: false,
    hasPendingUpdate: true,
    hasReloadedInSession: false,
    ...overrides,
  };
};

describe("canApplyUpdate", () => {
  it("タイトルでフォーム未展開・通知なし・未リロードなら適用できること", () => {
    expect(canApplyUpdate(createApplicableState())).toBe(true);
  });

  it("ロビー表示中は適用しないこと", () => {
    expect(
      canApplyUpdate(
        createApplicableState({ scenePhase: domain.app.ScenePhase.LOBBY }),
      ),
    ).toBe(false);
  });

  it("ゲーム中は適用しないこと", () => {
    expect(
      canApplyUpdate(
        createApplicableState({ scenePhase: domain.app.ScenePhase.PLAYING }),
      ),
    ).toBe(false);
  });

  it("リザルト表示中は適用しないこと", () => {
    // 試合結果はメモリ上にしか無く，リロードすると閲覧できなくなる
    expect(
      canApplyUpdate(
        createApplicableState({ scenePhase: domain.app.ScenePhase.RESULT }),
      ),
    ).toBe(false);
  });

  it("タイトルでも入力フォームを表示中は適用しないこと", () => {
    expect(
      canApplyUpdate(createApplicableState({ isTitleFormOpen: true })),
    ).toBe(false);
  });

  it("接続断の通知を表示中は適用しないこと", () => {
    expect(
      canApplyUpdate(createApplicableState({ hasConnectionNotice: true })),
    ).toBe(false);
  });

  it("適用待ちの更新が無い場合は適用しないこと", () => {
    expect(
      canApplyUpdate(createApplicableState({ hasPendingUpdate: false })),
    ).toBe(false);
  });

  it("このセッションで既にリロード済みなら適用しないこと", () => {
    expect(
      canApplyUpdate(createApplicableState({ hasReloadedInSession: true })),
    ).toBe(false);
  });

  it("タイトルでも更新が無ければ適用しないこと（フォーム未展開でも同様）", () => {
    expect(
      canApplyUpdate(
        createApplicableState({
          hasPendingUpdate: false,
          isTitleFormOpen: false,
        }),
      ),
    ).toBe(false);
  });

  it("ゲーム中に保留した更新がタイトルへ戻った時点で適用可能になること", () => {
    const duringGame = createApplicableState({
      scenePhase: domain.app.ScenePhase.PLAYING,
    });

    expect(canApplyUpdate(duringGame)).toBe(false);
    expect(
      canApplyUpdate({
        ...duringGame,
        scenePhase: domain.app.ScenePhase.TITLE,
      }),
    ).toBe(true);
  });

  it("フォームを閉じた時点で保留中の更新が適用可能になること", () => {
    const formOpen = createApplicableState({ isTitleFormOpen: true });

    expect(canApplyUpdate(formOpen)).toBe(false);
    expect(canApplyUpdate({ ...formOpen, isTitleFormOpen: false })).toBe(true);
  });

  it("接続断の通知を閉じた時点で保留中の更新が適用可能になること", () => {
    const noticeShown = createApplicableState({ hasConnectionNotice: true });

    expect(canApplyUpdate(noticeShown)).toBe(false);
    expect(canApplyUpdate({ ...noticeShown, hasConnectionNotice: false })).toBe(
      true,
    );
  });

  it("リロード済みならタイトルへ戻っても適用しないこと", () => {
    expect(
      canApplyUpdate(
        createApplicableState({
          hasReloadedInSession: true,
          scenePhase: domain.app.ScenePhase.TITLE,
        }),
      ),
    ).toBe(false);
  });

  it("タイトル以外のどのフェーズでも適用しないこと", () => {
    const blockedPhases = [
      domain.app.ScenePhase.LOBBY,
      domain.app.ScenePhase.PLAYING,
      domain.app.ScenePhase.RESULT,
    ];

    const applicablePhases = blockedPhases.filter((scenePhase) =>
      canApplyUpdate(createApplicableState({ scenePhase })),
    );

    expect(applicablePhases).toEqual([]);
  });

  it("阻害要因が複数重なっている場合も適用しないこと", () => {
    expect(
      canApplyUpdate(
        createApplicableState({
          scenePhase: domain.app.ScenePhase.PLAYING,
          isTitleFormOpen: true,
          hasConnectionNotice: true,
          hasReloadedInSession: true,
        }),
      ),
    ).toBe(false);
  });
});
