/**
 * GameNetworkEventAdapter
 * 受信イベントペイロードを内部イベント入力へ変換する
 * 外部プロトコル互換を維持しつつ内部命名へ正規化する
 */
import type {
  BombPlacedAckPayload,
  BombPlacedPayload,
  GameStartPayload,
  PlayerDeadPayload,
} from "@repo/shared";

/** ゲーム開始受信ペイロードから開始時刻を抽出する */
export const toGameStartedAt = (payload: GameStartPayload): number | null => {
  if (!payload || !payload.startTime) {
    return null;
  }

  return payload.startTime;
};

/** 爆弾設置受信ペイロードを内部ペイロードへ正規化する */
export const toRemoteBombPlacedPayload = (
  payload: BombPlacedPayload,
): BombPlacedPayload => {
  return payload;
};

/** 爆弾設置ACK受信ペイロードを内部ペイロードへ正規化する */
export const toBombPlacementAcknowledgedPayload = (
  payload: BombPlacedAckPayload,
): BombPlacedAckPayload => {
  return payload;
};

/** プレイヤー死亡受信ペイロードを内部ペイロードへ正規化する */
export const toRemotePlayerDeadPayload = (
  payload: PlayerDeadPayload,
): PlayerDeadPayload => {
  return payload;
};