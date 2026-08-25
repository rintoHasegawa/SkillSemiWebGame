/**
 * protocolVersionGuard
 * ハンドシェイク時にクライアントのプロトコル契約バージョンを照合するミドルウェアを提供する
 * 版ずれのクライアント（キャッシュに残った旧バンドル等）を接続前に拒否する
 */
import type { Server } from "socket.io";
import { contracts as protocol } from "@repo/shared";
import { logEvent } from "@server/logging/logger";
import {
  logResults,
  logScopes,
  networkLogEvents,
} from "@server/logging/index";

/** Socket.IOのコネクションミドルウェア型 */
type ConnectionMiddleware = Parameters<Server["use"]>[0];

/** ログに残せない値を潰すための代替表記 */
const UNKNOWN_PROTOCOL_VERSION = "unknown";

// 任意の値を送れる項目のため，ログへ残す長さを制限する
const MAX_LOGGED_VERSION_LENGTH = 32;

/** ハンドシェイクで受け取った値が対応プロトコル版かを判定する */
export const isSupportedProtocolVersion = (value: unknown): boolean => {
  return value === protocol.PROTOCOL_VERSION;
};

/** 受け取った値をログ出力可能な文字列へ変換する */
export const formatReceivedProtocolVersion = (value: unknown): string => {
  if (typeof value !== "string") {
    return UNKNOWN_PROTOCOL_VERSION;
  }

  return value.slice(0, MAX_LOGGED_VERSION_LENGTH);
};

/** プロトコル版が一致しない接続を拒否するミドルウェアを生成する */
export const createProtocolVersionGuard = (): ConnectionMiddleware => {
  return (socket, next) => {
    // ハンドシェイクの auth は任意の値が入りうるため unknown として扱う
    const receivedVersion: unknown = socket.handshake.auth?.protocolVersion;

    if (isSupportedProtocolVersion(receivedVersion)) {
      next();
      return;
    }

    // 拒否理由を残してからハンドシェイクを打ち切る
    logEvent(logScopes.NETWORK, {
      event: networkLogEvents.PROTOCOL_VERSION_CHECK,
      result: logResults.REJECTED_PROTOCOL_VERSION,
      socketId: socket.id,
      expectedProtocolVersion: protocol.PROTOCOL_VERSION,
      receivedProtocolVersion: formatReceivedProtocolVersion(receivedVersion),
    });

    next(new Error(protocol.PROTOCOL_VERSION_MISMATCH_ERROR));
  };
};
