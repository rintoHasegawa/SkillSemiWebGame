/**
 * corsPolicy
 * 環境変数からCORSの許可オリジン設定を解決する
 */
import { parseAllowedOrigins } from "./originPolicy";

/** CORS判定に必要な解決済み設定 */
export type CorsPolicy = {
  isDevelopment: boolean;
  allowedOrigins: readonly string[];
};

/** 環境変数からCORSポリシーを解決する（引数のenvはテストからの差し替え用） */
export const resolveCorsPolicy = (
  env: NodeJS.ProcessEnv = process.env,
): CorsPolicy => {
  const isDevelopment = env.NODE_ENV !== "production";
  const allowedOrigins = parseAllowedOrigins(env.CORS_ORIGIN);

  // 本番でallowlistが空なら設定ミスのため起動時に落とす
  if (isDevelopment === false && allowedOrigins.length === 0) {
    throw new Error(
      "本番環境では環境変数 CORS_ORIGIN の設定が必須である．" +
        "クライアントの配信元オリジンをカンマ区切りで指定すること" +
        "（例: CORS_ORIGIN=https://pixel-paint-war-client.onrender.com）",
    );
  }

  return {
    isDevelopment,
    allowedOrigins,
  };
};
