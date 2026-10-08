/**
 * isBombFeverTime.test
 * HUD向けフィーバー判定が実ゲートと同じ経過時間基準で解決されることを検証する
 * 秒表示の切り捨てで先行してフィーバー扱いになる区間を回帰防止する
 * 試合時間を上書きした場合も実行中の試合時間（GAME_START で配られた値）に追従すること
 * （SPEC_03「試合時間の開発モード限定の上書き」）を検証する
 */
import { afterEach, describe, expect, it } from "vitest";
import { domain } from "@repo/shared";
import { applyRuntimeGameDurationFromGameStart, config } from "@client/config";
import { GameTimer } from "@client/scenes/game/application/GameTimer";
import { isBombFeverTime } from "./isBombFeverTime";

const {
  GAME_DURATION_SEC,
  BOMB_FEVER_START_REMAINING_SEC,
  BOMB_FEVER_COOLDOWN_MS,
  BOMB_NORMAL_COOLDOWN_MS,
} = config.GAME_CONFIG;

const FEVER_START_ELAPSED_MS =
  (GAME_DURATION_SEC - BOMB_FEVER_START_REMAINING_SEC) * 1000;

// サーバー基準の符号付き経過msを注入したタイマーを生成する
const createTimerAt = (signedElapsedMs: number): GameTimer => {
  return new GameTimer(() => signedElapsedMs);
};

describe("isBombFeverTime", () => {
  it("ゲーム開始直後はフィーバーとみなさないこと", () => {
    expect(isBombFeverTime(0)).toBe(false);
  });

  it("フィーバー開始ちょうどの経過時間ではフィーバーとみなすこと", () => {
    expect(isBombFeverTime(FEVER_START_ELAPSED_MS)).toBe(true);
  });

  it("フィーバー開始以降はフィーバーとみなし続けること", () => {
    expect(isBombFeverTime(GAME_DURATION_SEC * 1000)).toBe(true);
  });

  it("残り時間表示が切り捨てでしきい値に達しても実経過が未達ならフィーバーとみなさないこと", () => {
    const elapsedMs = FEVER_START_ELAPSED_MS - 500;
    const timer = createTimerAt(elapsedMs);

    // 表示用の残り秒はしきい値と同値になるが実際の残り時間は超えている
    expect(Math.floor(timer.getRemainingTime())).toBe(
      BOMB_FEVER_START_REMAINING_SEC,
    );
    expect(domain.game.bomb.resolveBombCooldownMs(elapsedMs)).toBe(
      BOMB_NORMAL_COOLDOWN_MS,
    );
    expect(isBombFeverTime(timer.getElapsedMs())).toBe(false);
  });

  it("時計未同期の間はフィーバーとみなさないこと", () => {
    const timer = new GameTimer();

    expect(isBombFeverTime(timer.getElapsedMs())).toBe(false);
  });

  it("カウントダウン中の負の経過msではフィーバーとみなさないこと", () => {
    const timer = createTimerAt(-3000);

    expect(isBombFeverTime(timer.getElapsedMs())).toBe(false);
  });

  it("境界前後の経過時間で爆弾クールダウンの解決結果と判定が一致すること", () => {
    const elapsedMsList = [
      FEVER_START_ELAPSED_MS - 1_001,
      FEVER_START_ELAPSED_MS - 1_000,
      FEVER_START_ELAPSED_MS - 999,
      FEVER_START_ELAPSED_MS - 500,
      FEVER_START_ELAPSED_MS - 1,
      FEVER_START_ELAPSED_MS,
      FEVER_START_ELAPSED_MS + 1,
    ];

    elapsedMsList.forEach((elapsedMs) => {
      const isFeverCooldown =
        domain.game.bomb.resolveBombCooldownMs(elapsedMs)
          === BOMB_FEVER_COOLDOWN_MS;

      expect(isBombFeverTime(elapsedMs)).toBe(isFeverCooldown);
    });
  });
});

// SPEC_03「試合時間の開発モード限定の上書き」: しきい値は残り時間基準のまま，60 秒以下では開始直後からフィーバー
describe("isBombFeverTime（試合時間の上書き）", () => {
  afterEach(() => {
    applyRuntimeGameDurationFromGameStart({});
  });

  it("30秒の試合では開始直後からフィーバーとみなすこと", () => {
    applyRuntimeGameDurationFromGameStart({ gameDurationSec: 30 });

    expect(isBombFeverTime(0)).toBe(true);
  });

  it("90秒の試合では残り60秒ちょうど（経過30秒）でフィーバーとみなすこと", () => {
    applyRuntimeGameDurationFromGameStart({ gameDurationSec: 90 });

    expect(isBombFeverTime(30_000)).toBe(true);
  });

  it("90秒の試合ではフィーバー開始の1ms手前はフィーバーとみなさないこと", () => {
    applyRuntimeGameDurationFromGameStart({ gameDurationSec: 90 });

    expect(isBombFeverTime(29_999)).toBe(false);
  });

  it("上書きが無い開始通知を受けると既定の180秒基準へ戻り開始直後はフィーバーとみなさないこと", () => {
    applyRuntimeGameDurationFromGameStart({ gameDurationSec: 30 });
    applyRuntimeGameDurationFromGameStart({});

    expect(isBombFeverTime(0)).toBe(false);
  });
});
