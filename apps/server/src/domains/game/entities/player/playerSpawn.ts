/**
 * playerSpawn
 * プレイヤー初期生成時のスポーン座標設定を提供する
 */
import { config } from "@server/config";
import { Player } from "./Player.js";

type SpawnMapSize = {
  gridCols: number;
  gridRows: number;
};

/** プレイヤーを生成し，初期スポーン座標を設定して返す */
// 💡 引数に teamId を追加
export const createSpawnedPlayer = (
  id: string,
  name: string,
  teamId: number,
  mapSize?: SpawnMapSize,
): Player => {
  const player = new Player(id, name, teamId); // ここにteamIdを渡す！

  const { TEAM_COUNT } = config.GAME_CONFIG;
  const gridCols = mapSize?.gridCols ?? config.GAME_CONFIG.GRID_COLS;
  const gridRows = mapSize?.gridRows ?? config.GAME_CONFIG.GRID_ROWS;

  let baseX = gridCols / 2;
  let baseY = gridRows / 2;

  switch (player.teamId % TEAM_COUNT) {
    case 0: // 左上
      baseX = 2;
      baseY = 2;
      break;
    case 1: // 右下
      baseX = gridCols - 2;
      baseY = gridRows - 2;
      break;
    case 2: // 右上
      baseX = gridCols - 2;
      baseY = 2;
      break;
    case 3: // 左下
      baseX = 2;
      baseY = gridRows - 2;
      break;
  }

  const scatterX = (Math.random() - 0.5) * 2;
  const scatterY = (Math.random() - 0.5) * 2;

  player.x = Math.max(1, Math.min(gridCols - 1, baseX + scatterX));
  player.y = Math.max(1, Math.min(gridRows - 1, baseY + scatterY));

  // リスポーン時に戻る座標として初期位置を保持する
  player.initialX = player.x;
  player.initialY = player.y;

  return player;
};
