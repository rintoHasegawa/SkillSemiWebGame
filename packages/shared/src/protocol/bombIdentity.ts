/**
 * bombIdentity
 * 爆弾通信ペイロードの識別キー生成を提供する
 * クライアントとサーバーで同一規約のID生成を共有する
 */
import type { BombPlacedPayload } from "./eventPayloads";

/** 通信で扱う爆弾基本ペイロード型 */
export type BombNetworkPayload = BombPlacedPayload;

/** 爆弾ペイロードから同期用IDを生成する */
export const createBombIdFromPayload = (payload: BombNetworkPayload): string => {
  return payload.bombId;
};
