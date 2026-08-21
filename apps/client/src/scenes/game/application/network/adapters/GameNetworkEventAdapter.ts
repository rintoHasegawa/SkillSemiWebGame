/**
 * GameNetworkEventAdapter
 * 受信イベントペイロードを内部イベント入力へ変換する
 * 外部プロトコル互換を維持しつつ内部命名へ正規化する
 */
import type {
  BombPlacedAckPayload,
  BombPlacedPayload,
  GameStartPayload,
  HurricaneHitPayload,
  PlayerHitPayload,
} from "@repo/shared";

/**
 * ゲーム開始受信ペイロードから開始時刻を抽出する
 * サーバー時刻基準の開始時刻を返し，NaN・Infinity 等の不正値は null を返す
 */
export const toGameStartedAt = (payload: GameStartPayload): number | null => {
  if (!payload || !Number.isFinite(payload.startTime)) {
    console.error(
      "[GameNetworkEventAdapter] GAME_STARTの開始時刻が有限数でないため破棄する",
      payload?.startTime,
    );
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

/** プレイヤー被弾受信ペイロードを内部ペイロードへ正規化する */
export const toRemotePlayerHitPayload = (
  payload: PlayerHitPayload,
): PlayerHitPayload => {
  return payload;
};

/** ハリケーン被弾受信ペイロードを内部ペイロードへ正規化する */
export const toRemoteHurricaneHitPayload = (
  payload: HurricaneHitPayload,
): HurricaneHitPayload => {
  return payload;
};
