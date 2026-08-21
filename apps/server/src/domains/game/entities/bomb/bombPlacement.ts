/**
 * bombPlacement
 * 爆弾設置時の識別キー生成と確定ペイロード組み立てを提供する
 */
import type { BombPlacedAckPayload, BombPlacedPayload, PlaceBombPayload } from "@repo/shared";
import { joinDedupeKeySegments } from "./dedupeKeyEncoding.js";

/**
 * 重複排除に利用する爆弾設置要求キーを生成する
 * ownerId・requestId は任意文字列のため長さプレフィックス方式で連結する
 */
export const createBombDedupeKey = (ownerId: string, requestId: string): string => {
  return joinDedupeKeySegments(ownerId, requestId);
};

type CreateBombPlacedPayloadParams = {
  payload: PlaceBombPayload;
  bombId: string;
  ownerTeamId: number;
};

/** 爆弾確定通知で他プレイヤーへ配信するペイロードを生成する */
export const createBombPlacedPayload = ({
  payload,
  bombId,
  ownerTeamId,
}: CreateBombPlacedPayloadParams): BombPlacedPayload => {
  return {
    bombId,
    ownerTeamId,
    x: payload.x,
    y: payload.y,
    explodeAtElapsedMs: payload.explodeAtElapsedMs,
  };
};

type CreateBombPlacedAckPayloadParams = {
  requestId: string;
  bombId: string;
};

/** 爆弾確定通知で設置者本人へ配信するACKペイロードを生成する */
export const createBombPlacedAckPayload = ({
  requestId,
  bombId,
}: CreateBombPlacedAckPayloadParams): BombPlacedAckPayload => {
  return {
    requestId,
    bombId,
  };
};
