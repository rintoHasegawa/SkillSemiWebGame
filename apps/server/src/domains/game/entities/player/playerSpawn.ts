/**
 * playerSpawn
 * プレイヤー初期生成時のスポーン座標設定を提供する
 */
import { domain } from "@repo/shared";
import { config } from "@server/config";
import { Player } from "./Player.js";

type SpawnMapSize = {
  gridCols: number;
  gridRows: number;
};

type SpawnBasePosition = {
  baseX: number;
  baseY: number;
};

// チームごとのスポーン基準座標（マップ四隅）を解決する
const resolveSpawnBasePosition = (
  teamId: number,
  { gridCols, gridRows }: SpawnMapSize,
): SpawnBasePosition => {
  switch (teamId) {
    case 0: // 左上
      return { baseX: 2, baseY: 2 };
    case 1: // 右下
      return { baseX: gridCols - 2, baseY: gridRows - 2 };
    case 2: // 右上
      return { baseX: gridCols - 2, baseY: 2 };
    case 3: // 左下
      return { baseX: 2, baseY: gridRows - 2 };
    default:
      // TEAM_COUNT を増やした際のスポーン座標定義漏れ（設定ミス）を検出する
      throw new Error(`Spawn position is not defined for teamId: ${teamId}`);
  }
};

/**
 * プレイヤーを生成し，初期スポーン座標を設定して返す
 * teamId が有効範囲外の場合は不変条件違反として例外を投げる
 */
export const createSpawnedPlayer = (
  id: string,
  name: string,
  teamId: number,
  mapSize?: SpawnMapSize,
): Player => {
  // 未確定・範囲外の teamId でのスポーンは不変条件違反として即座に落とす
  config.assertValidTeamId(teamId);

  const player = new Player(id, name, teamId);

  const gridCols = mapSize?.gridCols ?? config.GAME_CONFIG.GRID_COLS;
  const gridRows = mapSize?.gridRows ?? config.GAME_CONFIG.GRID_ROWS;

  const { baseX, baseY } = resolveSpawnBasePosition(player.teamId, {
    gridCols,
    gridRows,
  });

  const scatterX = (Math.random() - 0.5) * 2;
  const scatterY = (Math.random() - 0.5) * 2;

  // 小さいマップでも範囲外にならないよう移動時と同じ境界式でクランプする
  const spawnPosition = domain.game.player.clampPositionToMapBounds(
    { x: baseX + scatterX, y: baseY + scatterY },
    { gridCols, gridRows },
  );

  player.x = spawnPosition.x;
  player.y = spawnPosition.y;

  // リスポーン時に戻る座標として初期位置を保持する
  player.initialX = player.x;
  player.initialY = player.y;

  return player;
};
