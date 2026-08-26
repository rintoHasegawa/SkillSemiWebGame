/**
 * sessionToken
 * ハンドシェイクで受け取るセッショントークンの取り出しと検証を提供する
 * トークンを送らないクライアントも従来どおり接続できるようにする
 */
import type { Socket } from "socket.io";

// 任意の値を送れる項目のため，扱う長さを制限する
const MAX_SESSION_TOKEN_LENGTH = 128;

/**
 * ハンドシェイクのセッショントークンを取り出す
 * 文字列以外・空文字・長すぎる値は未提示として扱う
 */
export const resolveSessionToken = (socket: Socket): string | undefined => {
  // ハンドシェイクの auth は任意の値が入りうるため unknown として扱う
  const receivedToken: unknown = socket.handshake.auth?.sessionToken;

  if (typeof receivedToken !== "string") {
    return undefined;
  }

  if (
    receivedToken.length === 0 ||
    receivedToken.length > MAX_SESSION_TOKEN_LENGTH
  ) {
    return undefined;
  }

  return receivedToken;
};
