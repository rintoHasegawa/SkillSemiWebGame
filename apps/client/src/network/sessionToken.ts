/**
 * sessionToken
 * 一時的な離席から試合へ復帰するためのセッショントークンを扱う
 * ハンドシェイクで提示する識別子をタブ単位（sessionStorage）で保持する
 * sessionStorage が使えない環境でもアプリを止めないようメモリへフォールバックする
 */

/** セッショントークンを保存する sessionStorage のキー */
const SESSION_TOKEN_STORAGE_KEY = "ppw:session-token";

// sessionStorage を参照できない環境でトークンを保持するためのフォールバック
let fallbackSessionToken: string | null = null;

// 復帰予約の照合にのみ使うため，衝突しない程度のランダム文字列を生成する
const createSessionToken = (): string => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  // randomUUID が使えない環境（非セキュアコンテキスト等）は時刻＋乱数で代替する
  const randomPart = Math.random().toString(36).slice(2);
  return `ppw-${Date.now().toString(36)}-${randomPart}`;
};

// 保存済みトークンを読み出す（参照できない場合はメモリ上の値を使う）
const readStoredSessionToken = (): string | null => {
  // 保存に失敗した環境で毎回別のトークンを作らないよう，メモリ上の値を優先する
  if (fallbackSessionToken !== null) {
    return fallbackSessionToken;
  }

  try {
    return globalThis.sessionStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
  } catch {
    // プライベートモード等で参照できない場合は未保存として扱う
    return null;
  }
};

// トークンを保存する（保存失敗時もメモリ上の値で継続する）
const writeStoredSessionToken = (token: string): void => {
  fallbackSessionToken = token;

  try {
    globalThis.sessionStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token);
  } catch (error) {
    console.error(
      "[sessionToken] セッショントークンの保存に失敗しました",
      error,
    );
  }
};

/** 保存済みのセッショントークンを返す（未保存なら生成して保存する） */
export const loadOrCreateSessionToken = (): string => {
  const storedToken = readStoredSessionToken();
  if (storedToken !== null && storedToken !== "") {
    return storedToken;
  }

  const token = createSessionToken();
  writeStoredSessionToken(token);
  return token;
};

/**
 * 保存済みのセッショントークンを破棄する
 * 退室時の予約破棄はサーバが LEAVE_ROOM 受信時に行うため，通常の画面遷移では呼ばない
 * （現状はモジュール内の保持をリセットする用途で参照する）
 */
export const clearSessionToken = (): void => {
  fallbackSessionToken = null;

  try {
    globalThis.sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error(
      "[sessionToken] セッショントークンの破棄に失敗しました",
      error,
    );
  }
};

/**
 * 新しいセッショントークンを発行して保存する
 * サーバはハンドシェイク時のトークンを接続中保持するため，
 * 発行後の値が反映されるのは次のハンドシェイク（再接続）以降になる
 * ※ 現状どの画面遷移からも呼んでいない．切断を伴わずに更新すると，サーバが保持する
 *   旧トークンと保存済みの新トークンがずれ，次戦以降の復帰予約が空振りして
 *   復帰の成否が交互になるため．退室時の予約破棄は LEAVE_ROOM でサーバ側が行うので
 *   更新は不要であり，将来トークンを回すときは必ず切断とセットで呼ぶこと
 */
export const renewSessionToken = (): string => {
  const token = createSessionToken();
  writeStoredSessionToken(token);
  return token;
};
