/**
 * guard
 * 自動動作確認（/verify）で接続してよい先を判定するガード
 * 許可リスト（ローカルの client / server）以外は拒否し，本番ホストは拒否リストとしても持つ
 * 許可リストの設定ミスがあっても本番へ到達しないよう，拒否リストを先に評価する
 */

/** ローカルの client（Vite dev サーバー）の URL */
export const CLIENT_URL = "http://localhost:5173";

/** ローカルの server（Socket.IO サーバー）の URL */
export const SERVER_URL = "http://localhost:3000";

/** ローカルとみなすホスト名 */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** 接続を許可するローカルのポート（client: 5173 / server: 3000） */
const ALLOWED_LOCAL_PORTS = new Set(["5173", "3000"]);

/** 接続を許可するスキーム（http 系はホスト・ポートも検査する） */
const NETWORK_SCHEMES = new Set(["http:", "https:", "ws:", "wss:"]);

/** ネットワークを伴わないため常に許可するスキーム */
const LOCAL_ONLY_SCHEMES = new Set(["data:", "blob:", "about:"]);

/**
 * 本番・共有環境の拒否リスト（どんな場合も接続しない）
 * - Render 本番（client / server）: docs/02_ENV/ENV_09・ENV_10
 * - 研究室サーバ（Nginx :8803）: docs/02_ENV/ENV_09・ENV_11
 */
export const DENIED_HOST_RULES = [
  { label: "Render 本番 client", test: (host) => host === "pixel-paint-war-client.onrender.com" },
  { label: "Render 本番 server", test: (host) => host === "skillsemiwebgame.onrender.com" },
  { label: "Render（*.onrender.com）", test: (host) => host.endsWith(".onrender.com") },
  { label: "研究室サーバ", test: (host) => host === "192.168.0.10" },
  { label: "研究室サーバの公開ポート（:8803）", test: (_host, port) => port === "8803" },
];

/**
 * URL へ接続してよいかを判定する
 * @param {string} rawUrl
 * @returns {{ allowed: boolean, reason: string }}
 */
export const checkUrl = (rawUrl) => {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return { allowed: false, reason: "URL として解釈できない" };
  }

  if (LOCAL_ONLY_SCHEMES.has(url.protocol)) {
    return { allowed: true, reason: "ネットワークを伴わないスキーム" };
  }

  if (!NETWORK_SCHEMES.has(url.protocol)) {
    return { allowed: false, reason: `許可していないスキーム（${url.protocol}）` };
  }

  const host = url.hostname.toLowerCase();
  const port =
    url.port || (url.protocol === "https:" || url.protocol === "wss:" ? "443" : "80");

  // 拒否リストを最優先で評価する（許可リストの設定ミスで本番へ届かないようにする）
  const denied = DENIED_HOST_RULES.find((rule) => rule.test(host, port));
  if (denied) {
    return { allowed: false, reason: `拒否リスト: ${denied.label}` };
  }

  if (!LOCAL_HOSTS.has(host)) {
    return { allowed: false, reason: `ローカル以外のホスト（${host}）` };
  }

  if (!ALLOWED_LOCAL_PORTS.has(port)) {
    return { allowed: false, reason: `許可していないローカルポート（${port}）` };
  }

  return { allowed: true, reason: "ローカルの client / server" };
};

/**
 * 接続してよい URL でなければ例外を投げる
 * @param {string} rawUrl
 * @param {string} label エラーメッセージに出す接続先の説明
 */
export const assertAllowedUrl = (rawUrl, label) => {
  const { allowed, reason } = checkUrl(rawUrl);
  if (!allowed) {
    throw new Error(`${label} への接続を拒否しました: ${rawUrl}（${reason}）`);
  }
};
