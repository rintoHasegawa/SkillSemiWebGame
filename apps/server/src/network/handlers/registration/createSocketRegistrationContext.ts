/**
 * createSocketRegistrationContext
 * ソケット受信イベント登録で利用する共通コンテキストを生成する
 */
import type { Socket } from "socket.io";
import type { CurrentPlayerIdResolver } from "@server/network/identity";
import { createPayloadGuard } from "../payloadGuard";
import { createServerSocketOnBridge } from "../socketEventBridge";

/** 受信イベント登録で利用する共通コンテキスト */
type SocketRegistrationContext = {
  onEvent: ReturnType<typeof createServerSocketOnBridge>["onEvent"];
  guardOnEvent: ReturnType<typeof createPayloadGuard>["guardOnEvent"];
};

/**
 * ソケット受信イベント登録で利用する共通コンテキストを生成する
 * プレイヤーIDは復帰で付け替わるため，解決関数として受け取り都度解決する
 */
export const createSocketRegistrationContext = (
  socket: Socket,
  resolvePlayerId: CurrentPlayerIdResolver,
): SocketRegistrationContext => {
  const { onEvent } = createServerSocketOnBridge(socket);
  const { guardOnEvent } = createPayloadGuard(resolvePlayerId);

  return {
    onEvent,
    guardOnEvent,
  };
};
