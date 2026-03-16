/**
 * aoiVisibility
 * ゲーム送信で利用するAOI可視判定ロジックを提供する
 * 受信者視点のAOI窓計算と対象可視判定を共通化する
 */
import { domain } from "@repo/shared";
import { config } from "@server/config";

/** AOI窓の境界型 */
export type AoiWindow = domain.game.aoi.AoiWindow;

/** グリッド座標を持つ可視判定対象型 */
export type AoiTarget = {
  x: number;
  y: number;
};

/** 受信者座標からAOI窓を解決する */
export const resolveViewerAoiWindow = (
  viewer: AoiTarget,
): AoiWindow => {
  const centerCell = domain.game.aoi.resolveAoiCellFromPosition(
    viewer.x,
    viewer.y,
    config.GAME_CONFIG.AOI_CELL_SIZE,
  );

  return domain.game.aoi.resolveAoiWindowFromCell(
    centerCell,
    config.GAME_CONFIG.AOI_WINDOW_COLS,
    config.GAME_CONFIG.AOI_WINDOW_ROWS,
  );
};

/** 対象座標がAOI窓に含まれるか判定する */
export const isTargetInAoiWindow = (
  target: AoiTarget,
  aoiWindow: AoiWindow,
): boolean => {
  return domain.game.aoi.isPositionInAoiWindow(
    target.x,
    target.y,
    aoiWindow,
    config.GAME_CONFIG.AOI_CELL_SIZE,
  );
};

/** 受信者座標からAOIセルを解決する */
export const resolveViewerAoiCell = (viewer: AoiTarget): domain.game.aoi.AoiCell => {
  return domain.game.aoi.resolveAoiCellFromPosition(
    viewer.x,
    viewer.y,
    config.GAME_CONFIG.AOI_CELL_SIZE,
  );
};
