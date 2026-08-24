/**
 * shouldShowFeverBanner.test
 * フィーバー開始バナーの表示条件が経過時間基準の判定に揃うことを検証する
 * 表示秒の切り捨てで開始1秒前に出て開始時に消える区間を回帰防止する
 */
import { describe, expect, it } from "vitest";
import { config } from "@client/config";
import { GameTimer } from "@client/scenes/game/application/GameTimer";
import { isBombFeverTime } from "@client/scenes/game/application/ui/isBombFeverTime";
import { shouldShowFeverBanner } from "./shouldShowFeverBanner";

const { GAME_DURATION_SEC, BOMB_FEVER_START_REMAINING_SEC } =
  config.GAME_CONFIG;

const FEVER_START_ELAPSED_MS =
  (GAME_DURATION_SEC - BOMB_FEVER_START_REMAINING_SEC) * 1000;

// GameManager が HUD へ載せる値と同じ手順でバナー表示条件を評価する
const evaluateBannerAt = (signedElapsedMs: number): boolean => {
  const timer = new GameTimer(() => signedElapsedMs);

  return shouldShowFeverBanner({
    isFeverTime: isBombFeverTime(timer.getElapsedMs()),
    remainingSeconds: Math.floor(timer.getRemainingTime()),
  });
};

describe("shouldShowFeverBanner", () => {
  it("ゲーム開始直後はバナーを表示しないこと", () => {
    expect(evaluateBannerAt(0)).toBe(false);
  });

  it("表示秒がしきい値でも実経過がフィーバー未達ならバナーを表示しないこと", () => {
    expect(evaluateBannerAt(FEVER_START_ELAPSED_MS - 500)).toBe(false);
  });

  it("フィーバー開始ちょうどでバナーを表示すること", () => {
    expect(evaluateBannerAt(FEVER_START_ELAPSED_MS)).toBe(true);
  });

  it("フィーバー開始直後の表示秒でもバナーを表示し続けること", () => {
    expect(evaluateBannerAt(FEVER_START_ELAPSED_MS + 500)).toBe(true);
  });

  it("フィーバー開始から1秒を過ぎたらバナーを消すこと", () => {
    expect(evaluateBannerAt(FEVER_START_ELAPSED_MS + 1_500)).toBe(false);
  });

  it("カウントダウン中はバナーを表示しないこと", () => {
    expect(evaluateBannerAt(-3000)).toBe(false);
  });

  it("時計未同期の間はバナーを表示しないこと", () => {
    const timer = new GameTimer();

    expect(
      shouldShowFeverBanner({
        isFeverTime: isBombFeverTime(timer.getElapsedMs()),
        remainingSeconds: Math.floor(timer.getRemainingTime()),
      }),
    ).toBe(false);
  });

  it("フィーバー判定が偽の間はしきい値の表示秒でもバナーを表示しないこと", () => {
    expect(
      shouldShowFeverBanner({
        isFeverTime: false,
        remainingSeconds: BOMB_FEVER_START_REMAINING_SEC,
      }),
    ).toBe(false);
  });

  it("残り時間表示が不正な値ならバナーを表示しないこと", () => {
    expect(
      shouldShowFeverBanner({
        isFeverTime: true,
        remainingSeconds: Number.POSITIVE_INFINITY,
      }),
    ).toBe(false);
  });
});
