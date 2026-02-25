/**
 * playerMovement
 * プレイヤー座標の検証と更新処理を提供する
 */
import { Player } from "./Player.js";

/** 座標値が有限数かを判定する */
export const isValidPosition = (x: number, y: number): boolean => {
  return Number.isFinite(x) && Number.isFinite(y);
};

/** プレイヤー座標を新しい値へ更新する */
export const setPlayerPosition = (
  player: Player,
  x: number,
  y: number
): void => {
  player.x = x;
  player.y = y;
};
