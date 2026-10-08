/**
 * index.test
 * server 設定の試合時間（開発モード限定の上書き）の反映と GAME_START 用フィールドの生成を検証するテスト
 * SPEC_03「試合時間の開発モード限定の上書き」を基準に，上書きした場合だけ gameDurationSec を配り，
 * 上書きしていない場合（本番を含む）はフィールドを送らないことを検証する
 * 設定は起動時（モジュール読み込み時）に環境変数から解決されるため，環境変数を差し替えて再読み込みする
 */
import { afterEach, describe, expect, it, vi } from "vitest";

// SPEC_03: 仕様上の試合時間（既定値）
const DEFAULT_GAME_DURATION_SEC = 180;

/** 環境変数を差し替えた状態で server 設定を読み込み直す */
const loadConfigWithEnv = async (
  overrideValue: string | undefined,
  nodeEnv = "development",
) => {
  vi.resetModules();
  vi.stubEnv("DEV_GAME_DURATION_SEC", overrideValue);
  vi.stubEnv("NODE_ENV", nodeEnv);
  return import("./index.js");
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("config.GAME_CONFIG.GAME_DURATION_SEC", () => {
  it("上書き未設定の場合は既定の180秒であること", async () => {
    const { config } = await loadConfigWithEnv(undefined);

    expect(config.GAME_CONFIG.GAME_DURATION_SEC).toBe(DEFAULT_GAME_DURATION_SEC);
  });

  it("開発モードで上書きした場合はその秒数であること", async () => {
    const { config } = await loadConfigWithEnv("30");

    expect(config.GAME_CONFIG.GAME_DURATION_SEC).toBe(30);
  });

  it("本番では上書きを無視して既定の180秒であること", async () => {
    const { config } = await loadConfigWithEnv("30", "production");

    expect(config.GAME_CONFIG.GAME_DURATION_SEC).toBe(DEFAULT_GAME_DURATION_SEC);
  });

  it("範囲外の値では既定の180秒であること", async () => {
    const { config } = await loadConfigWithEnv("181");

    expect(config.GAME_CONFIG.GAME_DURATION_SEC).toBe(DEFAULT_GAME_DURATION_SEC);
  });
});

describe("gameDurationOverride", () => {
  it("起動時に解決した上書き結果を公開すること", async () => {
    const { gameDurationOverride } = await loadConfigWithEnv("30", "production");

    expect(gameDurationOverride.status).toBe("ignored_production");
  });
});

describe("buildGameDurationPayloadField", () => {
  it("上書きを適用した場合はgameDurationSecを含むこと", async () => {
    const { buildGameDurationPayloadField } = await loadConfigWithEnv("30");

    expect(buildGameDurationPayloadField()).toEqual({ gameDurationSec: 30 });
  });

  it("上書き未設定の場合はフィールドを含まないこと", async () => {
    const { buildGameDurationPayloadField } = await loadConfigWithEnv(undefined);

    expect(buildGameDurationPayloadField()).toEqual({});
  });

  it("本番で上書きを無視した場合はフィールドを含まないこと", async () => {
    const { buildGameDurationPayloadField } = await loadConfigWithEnv(
      "30",
      "production",
    );

    expect(buildGameDurationPayloadField()).toEqual({});
  });

  it("不正値で上書きを無視した場合はフィールドを含まないこと", async () => {
    const { buildGameDurationPayloadField } = await loadConfigWithEnv("abc");

    expect(buildGameDurationPayloadField()).toEqual({});
  });

  it("上限180秒ちょうどで上書きした場合もフィールドを含むこと", async () => {
    const { buildGameDurationPayloadField } = await loadConfigWithEnv("180");

    expect(buildGameDurationPayloadField()).toEqual({ gameDurationSec: 180 });
  });
});
