/**
 * gamePayloadSanitizers
 * ゲーム関連の送信ペイロードを境界で正規化する
 */
import { domain } from "@repo/shared";
import type { UpdatePlayersPayload } from "@repo/shared";

type QuantizedPosition = {
  x: number;
  y: number;
};

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

/** UPDATE_PLAYERS の量子化済み差分から前回送信済みの同値座標を除外する */
export const filterUnchangedUpdatePlayersPayload = (
  players: UpdatePlayersPayload,
  lastSentPositionByPlayerId: Map<string, QuantizedPosition>
): UpdatePlayersPayload => {
  const changedPlayers: UpdatePlayersPayload = [];

  players.forEach((player) => {
    const lastSentPosition = lastSentPositionByPlayerId.get(player.id);
    const nextPosition = { x: player.x, y: player.y };

    if (
      lastSentPosition
      && domain.game.player.isSameMovePayload(lastSentPosition, nextPosition)
    ) {
      return;
    }

    lastSentPositionByPlayerId.set(player.id, nextPosition);
    changedPlayers.push(player);
  });

  return changedPlayers;
};
