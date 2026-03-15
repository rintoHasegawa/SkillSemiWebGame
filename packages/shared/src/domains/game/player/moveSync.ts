/**
 * moveSync
 * MOVE ペイロードの送信正規化に関する関数を提供する
 */
import { GAME_CONFIG } from "../../../config/gameConfig";
import type { MovePayload } from "./player.type";

/** MOVE ペイロード量子化の既定スケール */
export const DEFAULT_MOVE_QUANTIZE_SCALE =
  GAME_CONFIG.NETWORK_SYNC.POSITION_QUANTIZE_SCALE;

/** MOVE 座標を量子化して送信用の値へ正規化する */
export const quantizeMovePayload = (
  move: Readonly<MovePayload>,
  scale = DEFAULT_MOVE_QUANTIZE_SCALE,
): MovePayload => {
  return {
    x: quantizeMoveAxis(move.x, scale),
    y: quantizeMoveAxis(move.y, scale),
  };
};

/** MOVE ペイロードの値が一致するかを判定する */
export const isSameMovePayload = (
  left: Readonly<MovePayload>,
  right: Readonly<MovePayload>,
): boolean => {
  return left.x === right.x && left.y === right.y;
};

const quantizeMoveAxis = (value: number, scale: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (!Number.isFinite(scale) || scale <= 0) {
    return value;
  }

  return Math.round(value * scale) / scale;
};