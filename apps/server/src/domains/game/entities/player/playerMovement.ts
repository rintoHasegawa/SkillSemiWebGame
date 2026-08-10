/**
 * playerMovement
 * プレイヤー座標の検証とマップ範囲内へのクランプ更新処理を提供する
 */
import { domain } from "@repo/shared";
import { Player } from "./Player.js";

type SetPlayerPositionParams = {
  player: Player;
  x: number;
  y: number;
  mapSize?: domain.game.player.MapBoundsSize;
};

/** 座標値が有限数かを判定する */
export const isValidPosition = (x: number, y: number): boolean => {
  return Number.isFinite(x) && Number.isFinite(y);
};

/**
 * プレイヤー座標をマップ範囲内へクランプして更新する
 * 非有限座標は不正入力として無視し，直前の座標を維持する
 */
export const setPlayerPosition = ({
  player,
  x,
  y,
  mapSize,
}: SetPlayerPositionParams): void => {
  if (!isValidPosition(x, y)) {
    return;
  }

  const clamped = domain.game.player.clampPositionToMapBounds(
    { x, y },
    mapSize,
  );

  player.x = clamped.x;
  player.y = clamped.y;
};
