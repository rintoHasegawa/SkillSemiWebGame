/**
 * playerSpawn
 * プレイヤー初期生成時のスポーン座標設定を提供する
 */
import { config } from "@repo/shared";
import { Player } from "./Player.js";

/** プレイヤーを生成し，初期スポーン座標を設定して返す */
// 💡 引数は元通り `id` だけでOKです！
export const createSpawnedPlayer = (id: string): Player => {
  // ここで Player が作られ、同時に player.teamId も自動で決まります！
  const player = new Player(id);

  const { GRID_COLS, GRID_ROWS } = config.GAME_CONFIG;

  // 1. チームごとの基準点を決める
  let baseX = GRID_COLS / 2;
  let baseY = GRID_ROWS / 2;

  // 💡 自動で決まった teamId を使って、四隅に振り分ける
  switch (player.teamId % 4) {
    case 0: // チーム0: 左上
      baseX = 2;
      baseY = 2;
      break;
    case 1: // チーム1: 右下
      baseX = GRID_COLS - 2;
      baseY = GRID_ROWS - 2;
      break;
    case 2: // チーム2: 右上
      baseX = GRID_COLS - 2;
      baseY = 2;
      break;
    case 3: // チーム3: 左下
      baseX = 2;
      baseY = GRID_ROWS - 2;
      break;
  }

  // 2. 完全に同じ座標に重ならないように、少しランダムに散らす（±1マスの範囲）
  const scatterX = (Math.random() - 0.5) * 2;
  const scatterY = (Math.random() - 0.5) * 2;

  player.x = baseX + scatterX;
  player.y = baseY + scatterY;

  // マップ外（壁の中）にはみ出さないように制限（クランプ）
  player.x = Math.max(1, Math.min(GRID_COLS - 1, player.x));
  player.y = Math.max(1, Math.min(GRID_ROWS - 1, player.y));

  return player;
};
