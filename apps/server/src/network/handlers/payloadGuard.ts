/**
 * payloadGuard
 * 受信ペイロード検証と不正時ログ記録を共通化するガード生成を担う
 */
import { protocol } from "@repo/shared";
import { logEvent } from "@server/logging/logEvent";
import { logResults, logScopes } from "@server/logging/logEvents";

type PayloadValidator<TPayload> = (value: unknown) => value is TPayload;
type SocketEventName = (typeof protocol.SocketEvents)[keyof typeof protocol.SocketEvents];
type EventBoundPayloadGuard<TPayload> = (payload: unknown) => payload is TPayload;

/**
 * 受信ペイロードを検証し，不正時は共通ログを記録するガード関数を生成する
 */
export const createPayloadGuard = (socketId: string) => {
  const isValidPayload = <TPayload>(
    event: SocketEventName,
    payload: unknown,
    validator: PayloadValidator<TPayload>
  ): payload is TPayload => {
    if (validator(payload)) {
      return true;
    }

    logEvent(logScopes.NETWORK, {
      event,
      result: logResults.IGNORED_INVALID_PAYLOAD,
      socketId,
    });

    return false;
  };

  const guardOnEvent = <TPayload>(
    event: SocketEventName,
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
