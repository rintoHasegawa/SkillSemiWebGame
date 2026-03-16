/**
 * currentPlayersBootstrapBuilder
 * READY_FOR_GAME向けcurrent-playersペイロード生成を提供する
 * 自分とAOI内プレイヤーのみ初期表示座標を同梱する
 */
import { domain, type CurrentPlayersPayload } from "@repo/shared";
import { config } from "@server/config";

/** current-players初期表示ペイロードを生成する */
export const buildCurrentPlayersBootstrapPayload = (
  socketId: string,
  roomPlayers: domain.game.player.PlayerData[],
): CurrentPlayersPayload => {
  const me = roomPlayers.find((player) => player.id === socketId);
  const nearbyPlayerIds = new Set<string>();

  if (me) {
    const centerCell = domain.game.aoi.resolveAoiCellFromPosition(
      me.x,
      me.y,
      config.GAME_CONFIG.AOI_CELL_SIZE,
    );
    const aoiWindow = domain.game.aoi.resolveAoiWindowFromCell(
      centerCell,
      config.GAME_CONFIG.AOI_WINDOW_COLS,
      config.GAME_CONFIG.AOI_WINDOW_ROWS,
    );

    roomPlayers.forEach((player) => {
      if (player.id === socketId) {
        nearbyPlayerIds.add(player.id);
        return;
      }

      if (
        domain.game.aoi.isPositionInAoiWindow(
          player.x,
          player.y,
          aoiWindow,
          config.GAME_CONFIG.AOI_CELL_SIZE,
        )
      ) {
        nearbyPlayerIds.add(player.id);
      }
    });
  }

  return roomPlayers.map((player) => {
    const includePosition = nearbyPlayerIds.has(player.id);

    if (!includePosition) {
      return {
        id: player.id,
        name: player.name,
        teamId: player.teamId,
      };
    }

    const quantizedPosition = domain.game.player.quantizeMovePayload({
      x: player.x,
      y: player.y,
    });

    return {
      id: player.id,
      name: player.name,
      teamId: player.teamId,
      x: quantizedPosition.x,
      y: quantizedPosition.y,
    };
  });
};
