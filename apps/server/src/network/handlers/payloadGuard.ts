/**
 * payloadGuard
 * 受信ペイロード検証と不正時ログ記録を共通化するガード生成を担う
 */
import { protocol } from "@repo/shared";
import { logEvent } from "@server/logging/logEvent";

type PayloadValidator<TPayload> = (value: unknown) => value is TPayload;
type SocketEventName = (typeof protocol.SocketEvents)[keyof typeof protocol.SocketEvents];

/**
 * 受信ペイロードを検証し，不正時は共通ログを記録するガード関数を生成する
 */
export const createPayloadGuard = (socketId: string) => {
  return <TPayload>(
    event: SocketEventName,
    payload: unknown,
    validator: PayloadValidator<TPayload>
  ): payload is TPayload => {
    if (validator(payload)) {
      return true;
    }

    logEvent("Network", {
      event,
      result: "ignored_invalid_payload",
      socketId,
    });

    return false;
  };
};
