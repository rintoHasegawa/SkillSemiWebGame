/**
 * createSocketRegistrationContext
 * ソケット受信イベント登録で利用する共通コンテキストを生成する
 */
import type { Socket } from "socket.io";
import { createPayloadGuard } from "../payloadGuard";
import { createServerSocketOnBridge } from "../socketEventBridge";

/** 受信イベント登録で利用する共通コンテキスト */
type SocketRegistrationContext = {
  onEvent: ReturnType<typeof createServerSocketOnBridge>["onEvent"];
  guardOnEvent: ReturnType<typeof createPayloadGuard>["guardOnEvent"];
};

/** ソケット受信イベント登録で利用する共通コンテキストを生成する */
export const createSocketRegistrationContext = (
  socket: Socket,
): SocketRegistrationContext => {
  const { onEvent } = createServerSocketOnBridge(socket);
  const { guardOnEvent } = createPayloadGuard(socket.id);

  return {
    onEvent,
    guardOnEvent,
  };
};
