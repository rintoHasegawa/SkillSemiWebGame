/**
 * payloadGuard
 * 受信ペイロード検証と不正時ログ記録を共通化するガード生成を担う
 */
import { contracts as protocol } from "@repo/shared";
import { logEvent } from "@server/logging/logger";
import { logResults, logScopes } from "@server/logging/index";

type PayloadValidator<TPayload> = (value: unknown) => value is TPayload;
type EventBoundPayloadGuard<TPayload> = (payload: unknown) => payload is TPayload;

/** 不正ペイロード時に記録するログ契約をイベント単位で一元管理する */
const invalidPayloadLogByEvent = {
  [protocol.SocketEvents.JOIN_ROOM]: {
    event: protocol.SocketEvents.JOIN_ROOM,
    result: logResults.IGNORED_INVALID_PAYLOAD,
  },
  [protocol.SocketEvents.PING]: {
    event: protocol.SocketEvents.PING,
    result: logResults.IGNORED_INVALID_PAYLOAD,
  },
  [protocol.SocketEvents.MOVE]: {
    event: protocol.SocketEvents.MOVE,
    result: logResults.IGNORED_INVALID_PAYLOAD,
  },
  [protocol.SocketEvents.PLACE_BOMB]: {
    event: protocol.SocketEvents.PLACE_BOMB,
    result: logResults.IGNORED_INVALID_PAYLOAD,
  },
  [protocol.SocketEvents.BOMB_HIT_REPORT]: {
    event: protocol.SocketEvents.BOMB_HIT_REPORT,
    result: logResults.IGNORED_INVALID_PAYLOAD,
  },
  [protocol.SocketEvents.LOBBY_SETTINGS_UPDATE]: {
    event: protocol.SocketEvents.LOBBY_SETTINGS_UPDATE,
    result: logResults.IGNORED_INVALID_PAYLOAD,
  },
} as const;

type PayloadGuardEventName = keyof typeof invalidPayloadLogByEvent;

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

    const logContract = invalidPayloadLogByEvent[event];
    logEvent(logScopes.NETWORK, {
      ...logContract,
      socketId,
    });

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
