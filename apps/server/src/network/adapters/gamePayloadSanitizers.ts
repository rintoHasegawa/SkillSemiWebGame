/**
 * gamePayloadSanitizers
 * ゲーム関連の送信ペイロードを境界で正規化する
 */
import type { UpdatePlayersPayload } from "@repo/shared";

/** UPDATE_PLAYERS の送信値を座標差分のみへ正規化する */
export const sanitizeUpdatePlayersPayload = (
  players: UpdatePlayersPayload
): UpdatePlayersPayload => {
  return players.map(({ id, x, y }) => ({ id, x, y }));
};
