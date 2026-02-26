/**
 * payloadGuard
 * 受信ペイロード検証と不正時ログ記録を共通化するガード生成を担う
 */
import { protocol } from "@repo/shared";
import { logEvent } from "@server/logging/logger";
import { logResults, logScopes } from "@server/logging/index";

type PayloadValidator<TPayload> = (value: unknown) => value is TPayload;
type PayloadGuardEventName =
  | typeof protocol.SocketEvents.JOIN_ROOM
  | typeof protocol.SocketEvents.PING
  | typeof protocol.SocketEvents.MOVE
  | typeof protocol.SocketEvents.PLACE_BOMB
  | typeof protocol.SocketEvents.BOMB_HIT_REPORT;
type EventBoundPayloadGuard<TPayload> = (payload: unknown) => payload is TPayload;

/**
 * 受信ペイロードを検証し，不正時は共通ログを記録するガード関数を生成する
 */
export const createPayloadGuard = (socketId: string) => {
  const isValidPayload = <TPayload, TEvent extends PayloadGuardEventName>(
    event: TEvent,
    payload: unknown,
    validator: PayloadValidator<TPayload>
  ): payload is TPayload => {
    if (validator(payload)) {
      return true;
    }

    switch (event) {
      case protocol.SocketEvents.JOIN_ROOM:
        logEvent(logScopes.NETWORK, {
          event: protocol.SocketEvents.JOIN_ROOM,
          result: logResults.IGNORED_INVALID_PAYLOAD,
          socketId,
        });
        break;

      case protocol.SocketEvents.PING:
        logEvent(logScopes.NETWORK, {
          event: protocol.SocketEvents.PING,
          result: logResults.IGNORED_INVALID_PAYLOAD,
          socketId,
        });
        break;

      case protocol.SocketEvents.MOVE:
        logEvent(logScopes.NETWORK, {
          event: protocol.SocketEvents.MOVE,
          result: logResults.IGNORED_INVALID_PAYLOAD,
          socketId,
        });
        break;

      case protocol.SocketEvents.PLACE_BOMB:
        logEvent(logScopes.NETWORK, {
          event: protocol.SocketEvents.PLACE_BOMB,
          result: logResults.IGNORED_INVALID_PAYLOAD,
          socketId,
        });
        break;

      case protocol.SocketEvents.BOMB_HIT_REPORT:
        console.warn("[PayloadGuard] invalid BOMB_HIT_REPORT payload", {
          socketId,
        });
        break;
    }

    return false;
  };

  const guardOnEvent = <TPayload, TEvent extends PayloadGuardEventName>(
    event: TEvent,
    validator: PayloadValidator<TPayload>
  ): EventBoundPayloadGuard<TPayload> => {
    return (payload: unknown): payload is TPayload => {
      return isValidPayload(event, payload, validator);
    };
  };

  return {
    isValidPayload,
    guardOnEvent,
  };
};
