/**
 * gamePayloadSanitizers
 * ゲーム関連の送信ペイロードを境界で正規化する
 */
import { domain } from "@repo/shared";
import type { UpdatePlayersPayload } from "@repo/shared";

/** UPDATE_PLAYERS の送信値を座標差分のみへ正規化する */
export const sanitizeUpdatePlayersPayload = (
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
