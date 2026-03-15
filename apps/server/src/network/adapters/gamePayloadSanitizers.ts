/**
 * gamePayloadSanitizers
 * ゲーム関連の送信ペイロードを正規化し，同期差分へ変換する
 */
import { domain } from "@repo/shared";
import type { UpdatePlayersPayload } from "@repo/shared";
import { collectSyncDeltaEntries } from "@server/common/syncDelta";

type QuantizedPosition = {
  x: number;
  y: number;
};

/** UPDATE_PLAYERS の送信値を座標量子化した配列へ正規化する */
export const quantizeUpdatePlayersPayload = (
  players: UpdatePlayersPayload
): UpdatePlayersPayload => {
  return players.map(({ id, x, y }) => {
    const quantized = domain.game.player.quantizeMovePayload({ x, y });
    return {
      id,
      x: quantized.x,
      y: quantized.y,
    };
  });
};

/** UPDATE_PLAYERS の量子化済み配列から同値座標を除外して差分のみ返す */
export const collectChangedUpdatePlayersPayload = (
  players: UpdatePlayersPayload,
  lastSentPositionByPlayerId: Map<string, QuantizedPosition>
): UpdatePlayersPayload => {
  return collectSyncDeltaEntries(players, lastSentPositionByPlayerId, {
    selectId: (player) => player.id,
    toSnapshot: (player) => ({ x: player.x, y: player.y }),
    isSameSnapshot: (left, right) =>
      domain.game.player.isSameMovePayload(left, right),
  }).map((entry) => entry.item);
};

/** 既存呼び出し互換のため残す UPDATE_PLAYERS 量子化関数 */
export const sanitizeUpdatePlayersPayload = quantizeUpdatePlayersPayload;

/** 既存呼び出し互換のため残す UPDATE_PLAYERS 同値除外関数 */
export const filterUnchangedUpdatePlayersPayload =
  collectChangedUpdatePlayersPayload;
