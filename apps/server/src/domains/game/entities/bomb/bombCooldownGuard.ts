/**
 * bombCooldownGuard
 * 爆弾設置要求のサーバー側クールダウン判定を提供する
 * クライアント側判定をすり抜けた連投を受理しないための最終防衛線となる
 */

/**
 * クールダウン判定で許容する到着間隔の誤差（ms）
 * 受信間隔はネットワークジッタやクロック同期誤差で前後するため，
 * 正規クライアントの設置を誤って弾かないよう猶予を置く
 * （クライアントのクロック同期が許容するオフセット跳び幅 250ms に合わせる）
 */
export const BOMB_COOLDOWN_TOLERANCE_MS = 250;

type BombCooldownGuardParams = {
  lastAcceptedAtMsByPlayerId: Map<string, number>;
  playerId: string;
  nowMs: number;
  cooldownMs: number;
};

/**
 * 爆弾設置要求がクールダウンを満たすか判定し，受理時は直近受理時刻を更新する
 * 現在時刻が非有限の場合は間隔を判定できないため受理しない
 */
export const shouldAcceptBombPlacement = ({
  lastAcceptedAtMsByPlayerId,
  playerId,
  nowMs,
  cooldownMs,
}: BombCooldownGuardParams): boolean => {
  if (!Number.isFinite(nowMs)) {
    return false;
  }

  const lastAcceptedAtMs = lastAcceptedAtMsByPlayerId.get(playerId);
  if (
    lastAcceptedAtMs !== undefined
    && nowMs - lastAcceptedAtMs < cooldownMs - BOMB_COOLDOWN_TOLERANCE_MS
  ) {
    return false;
  }

  lastAcceptedAtMsByPlayerId.set(playerId, nowMs);
  return true;
};
