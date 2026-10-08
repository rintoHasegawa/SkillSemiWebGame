/**
 * gameDurationOverride
 * 開発モード限定で試合時間を環境変数から上書きする設定を解決する
 * 本番（NODE_ENV=production）では環境変数が設定されていても無視し，既定の試合時間を使う
 */
import { config as sharedConfig } from "@repo/shared";

/** 試合時間の上書きに使う環境変数名 */
export const GAME_DURATION_OVERRIDE_ENV_KEY = "DEV_GAME_DURATION_SEC";

/** 試合時間の上書き設定の解決結果 */
export type GameDurationOverrideResult =
  | { status: "default"; gameDurationSec: number }
  | { status: "applied"; gameDurationSec: number }
  | { status: "ignored_production"; gameDurationSec: number; rawValue: string }
  | { status: "ignored_invalid"; gameDurationSec: number; rawValue: string };

const DECIMAL_INTEGER_PATTERN = /^\d+$/;

/** 環境変数から試合時間の上書き設定を解決する（引数の env はテストからの差し替え用） */
export const resolveGameDurationOverride = (
  env: NodeJS.ProcessEnv = process.env,
): GameDurationOverrideResult => {
  const defaultSec = sharedConfig.GAME_CONFIG.GAME_DURATION_SEC;
  // 未設定かどうかは空白を除いて判定し，値の妥当性は元の値で判定する（前後の空白も不正とする）
  const rawValue = env[GAME_DURATION_OVERRIDE_ENV_KEY] ?? "";

  if (rawValue.trim() === "") {
    return { status: "default", gameDurationSec: defaultSec };
  }

  // 本番では上書きを一切受け付けない（設定ミスで本番の試合時間が変わることを防ぐ）
  if (env.NODE_ENV === "production") {
    return { status: "ignored_production", gameDurationSec: defaultSec, rawValue };
  }

  const parsed = DECIMAL_INTEGER_PATTERN.test(rawValue) ? Number(rawValue) : NaN;
  if (!sharedConfig.isValidGameDurationOverrideSec(parsed)) {
    return { status: "ignored_invalid", gameDurationSec: defaultSec, rawValue };
  }

  return { status: "applied", gameDurationSec: parsed };
};
