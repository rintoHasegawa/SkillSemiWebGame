/**
 * playerSpawn
 * プレイヤー初期生成時のスポーン座標設定を提供する
 */
import { config } from "@server/config";
import { Player } from "./Player.js";

/** プレイヤーを生成し，初期スポーン座標を設定して返す */
// 💡 引数に teamId を追加
export const createSpawnedPlayer = (
  id: string,
  name: string,
  teamId: number,
): Player => {
  const player = new Player(id, name, teamId); // ここにteamIdを渡す！

  const { GRID_COLS, GRID_ROWS, TEAM_COUNT } = config.GAME_CONFIG;

  let baseX = GRID_COLS / 2;
  let baseY = GRID_ROWS / 2;

  switch (player.teamId % TEAM_COUNT) {
    case 0: // 左上
      baseX = 2;
      baseY = 2;
      break;
    case 1: // 右下
      baseX = GRID_COLS - 2;
      baseY = GRID_ROWS - 2;
      break;
    case 2: // 右上
      baseX = GRID_COLS - 2;
      baseY = 2;
      break;
    case 3: // 左下
      baseX = 2;
      baseY = GRID_ROWS - 2;
      break;
  }

  const scatterX = (Math.random() - 0.5) * 2;
  const scatterY = (Math.random() - 0.5) * 2;

  player.x = Math.max(1, Math.min(GRID_COLS - 1, baseX + scatterX));
  player.y = Math.max(1, Math.min(GRID_ROWS - 1, baseY + scatterY));

  return player;
};
