/**
 * isBombFeverTime.test
 * HUD向けフィーバー判定が実ゲートと同じ経過時間基準で解決されることを検証する
 * 秒表示の切り捨てで先行してフィーバー扱いになる区間を回帰防止する
 */
import { describe, expect, it } from "vitest";
import { domain } from "@repo/shared";
import { config } from "@client/config";
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

// 開始時刻 0 のタイマーを任意の経過時間で評価する
const createTimerAt = (elapsedMs: number): GameTimer => {
  const timer = new GameTimer(() => elapsedMs);
  timer.setGameStart(0);

  return timer;
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
