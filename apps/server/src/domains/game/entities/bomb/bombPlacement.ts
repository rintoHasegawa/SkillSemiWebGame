/**
 * bombPlacement
 * 爆弾設置時の識別キー生成と確定ペイロード組み立てを提供する
 */
import type { BombPlacedPayload, PlaceBombPayload } from "@repo/shared";

/** 重複排除に利用する爆弾設置要求キーを生成する */
export const createBombDedupeKey = (ownerId: string, requestId: string): string => {
  return `${ownerId}:${requestId}`;
};

type CreateBombPlacedPayloadParams = {
  payload: PlaceBombPayload;
  bombId: string;
  ownerId: string;
};

/** 爆弾確定通知で配信するペイロードを生成する */
export const createBombPlacedPayload = ({
  payload,
  bombId,
  ownerId,
}: CreateBombPlacedPayloadParams): BombPlacedPayload => {
  return {
    ...payload,
    bombId,
    ownerId,
  };
};
