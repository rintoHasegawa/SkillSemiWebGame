/**
 * commonEventPayloadMap
 * 接続ライフサイクルイベントのペイロード対応表を定義する
 * CONNECT と DISCONNECT の契約を集約する
 */
import { SocketEvents } from "../socketEvents";

/** 接続ライフサイクルイベントのペイロード対応表 */
export type ConnectionLifecycleEventPayloadMap = {
  [SocketEvents.CONNECT]: undefined;
  [SocketEvents.DISCONNECT]: undefined;
};
