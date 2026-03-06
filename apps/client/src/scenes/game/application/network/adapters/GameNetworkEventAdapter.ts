/**
 * GameNetworkEventAdapter
 * 受信イベントペイロードを内部イベント入力へ変換する
 * 外部プロトコル互換を維持しつつ内部命名へ正規化する
 */
import type {
  BombPlacedAckPayload,
  BombPlacedPayload,
  GameStartPayload,
  PlayerHitPayload,
} from "@repo/shared";

/** ゲーム開始受信ペイロードから開始時刻を抽出する
 * serverNow を用いてクライアントとサーバーの時計差を補正し，
 * クライアント時計基準の開始時刻を返す
 */
export const toGameStartedAt = (payload: GameStartPayload): number | null => {
  if (!payload || !payload.startTime) {
    return null;
  }

  // clockOffset > 0: サーバーがクライアントより進んでいる
  const clockOffset = payload.serverNow - Date.now();
  return payload.startTime - clockOffset;
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

/** プレイヤー被弾受信ペイロードを内部ペイロードへ正規化する */
export const toRemotePlayerHitPayload = (
  payload: PlayerHitPayload,
): PlayerHitPayload => {
  return payload;
};