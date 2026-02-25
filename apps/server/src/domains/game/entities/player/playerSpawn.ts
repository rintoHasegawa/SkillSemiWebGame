/**
 * playerSpawn
 * プレイヤー初期生成時のスポーン座標設定を提供する
 */
import { config } from "@repo/shared";
import { Player } from "./Player.js";

/** プレイヤーを生成し，初期スポーン座標を設定して返す */
export const createSpawnedPlayer = (id: string): Player => {
  const player = new Player(id);
  player.x = config.GAME_CONFIG.GRID_COLS / 2;
  player.y = config.GAME_CONFIG.GRID_ROWS / 2;
  return player;
};
