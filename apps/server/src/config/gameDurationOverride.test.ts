/**
 * gameDurationOverride.test
 * 開発モード限定の試合時間上書き設定の解決を検証するユニットテスト
 * SPEC_03「試合時間の開発モード限定の上書き」を基準に，未設定・適用・本番で無視・不正値で無視の
 * 4 種類の結果と，いずれの無視でも既定の 180 秒へ倒れることを検証する
 */
import { describe, expect, it } from "vitest";

import {
  GAME_DURATION_OVERRIDE_ENV_KEY,
  resolveGameDurationOverride,
} from "./gameDurationOverride";

// SPEC_03: 仕様上の試合時間（既定値）
const DEFAULT_GAME_DURATION_SEC = 180;

/** 上書き値と NODE_ENV を指定した環境変数を生成する */
const createEnv = (
  value: string | undefined,
  nodeEnv: string | undefined = "development",
): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = {};
  if (value !== undefined) {
    env[GAME_DURATION_OVERRIDE_ENV_KEY] = value;
  }
  if (nodeEnv !== undefined) {
    env.NODE_ENV = nodeEnv;
  }
  return env;
};

describe("GAME_DURATION_OVERRIDE_ENV_KEY", () => {
  it("上書きに使う環境変数名がDEV_GAME_DURATION_SECであること", () => {
    expect(GAME_DURATION_OVERRIDE_ENV_KEY).toBe("DEV_GAME_DURATION_SEC");
  });
});

describe("resolveGameDurationOverride", () => {
  describe("未設定・空文字", () => {
    it("未設定の場合は既定の180秒でdefaultを返すこと", () => {
      expect(resolveGameDurationOverride(createEnv(undefined))).toEqual({
        status: "default",
        gameDurationSec: DEFAULT_GAME_DURATION_SEC,
      });
    });

    it("空文字の場合は既定の180秒でdefaultを返すこと", () => {
      expect(resolveGameDurationOverride(createEnv(""))).toEqual({
        status: "default",
        gameDurationSec: DEFAULT_GAME_DURATION_SEC,
      });
    });

    it("本番で未設定の場合はdefaultを返すこと", () => {
      expect(
        resolveGameDurationOverride(createEnv(undefined, "production")).status,
      ).toBe("default");
    });

    it("NODE_ENVも未設定の場合はdefaultを返すこと", () => {
      expect(resolveGameDurationOverride({}).status).toBe("default");
    });
  });

  describe("適用", () => {
    it("開発モードで30を指定した場合は30秒でappliedを返すこと", () => {
      expect(resolveGameDurationOverride(createEnv("30"))).toEqual({
        status: "applied",
        gameDurationSec: 30,
      });
    });

    it("下限10ちょうどを適用すること", () => {
      expect(resolveGameDurationOverride(createEnv("10"))).toEqual({
        status: "applied",
        gameDurationSec: 10,
      });
    });

    it("上限180ちょうどを適用すること", () => {
      expect(resolveGameDurationOverride(createEnv("180"))).toEqual({
        status: "applied",
        gameDurationSec: 180,
      });
    });

    it("NODE_ENVが未設定（productionでない）場合も適用すること", () => {
      expect(resolveGameDurationOverride(createEnv("45", undefined))).toEqual({
        status: "applied",
        gameDurationSec: 45,
      });
    });

    it("NODE_ENVがtestの場合も適用すること", () => {
      expect(resolveGameDurationOverride(createEnv("45", "test")).status).toBe(
        "applied",
      );
    });
  });

  describe("本番で無視", () => {
    it("NODE_ENV=productionでは正常値でも既定の180秒でignored_productionを返すこと", () => {
      expect(resolveGameDurationOverride(createEnv("30", "production"))).toEqual({
        status: "ignored_production",
        gameDurationSec: DEFAULT_GAME_DURATION_SEC,
        rawValue: "30",
      });
    });

    it("NODE_ENV=productionでは不正値もignored_productionとして既定値に倒すこと", () => {
      const result = resolveGameDurationOverride(createEnv("abc", "production"));

      expect(result.status).toBe("ignored_production");
      expect(result.gameDurationSec).toBe(DEFAULT_GAME_DURATION_SEC);
    });
  });

  describe("不正値で無視", () => {
    it.each(["9", "181", "30.5", "abc", "0", "-30", "3e1", "0x1e"])(
      "%sを指定した場合は既定の180秒でignored_invalidを返すこと",
      (value) => {
        const result = resolveGameDurationOverride(createEnv(value));

        expect(result.status).toBe("ignored_invalid");
        expect(result.gameDurationSec).toBe(DEFAULT_GAME_DURATION_SEC);
      },
    );

    it("ignored_invalidの結果に指定された値を含めること", () => {
      expect(resolveGameDurationOverride(createEnv("181"))).toEqual({
        status: "ignored_invalid",
        gameDurationSec: DEFAULT_GAME_DURATION_SEC,
        rawValue: "181",
      });
    });
  });

  describe("前後の空白", () => {
    // 十進の整数表記のみを受け付ける（ランナー run.mjs の CLI 検証と同じく前後空白は拒否する）
    it("前後に空白がある\" 45 \"は既定の180秒でignored_invalidを返すこと", () => {
      const result = resolveGameDurationOverride(createEnv(" 45 "));

      expect(result.status).toBe("ignored_invalid");
      expect(result.gameDurationSec).toBe(DEFAULT_GAME_DURATION_SEC);
    });

    it("空白のみの場合はdefaultを返すこと", () => {
      expect(resolveGameDurationOverride(createEnv("   ")).status).toBe(
        "default",
      );
    });
  });
});
