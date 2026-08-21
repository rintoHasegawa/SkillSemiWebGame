/**
 * moveSync
 * MOVE ペイロードの送信正規化に関する関数を提供する
 */
import { GAME_CONFIG } from "../../../config/gameConfig";
import type { MovePayload } from "./player.type";

/**
 * MOVE ペイロード量子化の既定スケール
 * リテラル型に固定されると呼び出し側で任意スケールを渡せなくなるため
 * number を明示する
 */
export const DEFAULT_MOVE_QUANTIZE_SCALE: number =
  GAME_CONFIG.NETWORK_SYNC.POSITION_QUANTIZE_SCALE;

/**
 * MOVE 座標を量子化して送信用の値へ正規化する
 * scale が非有限・0 以下の場合は既定スケールへフォールバックし，
 * 未量子化の生値が通信契約へ漏れないようにする
 */
export const quantizeMovePayload = (
  move: Readonly<MovePayload>,
  scale = DEFAULT_MOVE_QUANTIZE_SCALE,
): MovePayload => {
  return {
    x: quantizeMoveAxis(move.x, scale),
    y: quantizeMoveAxis(move.y, scale),
  };
};

/**
 * MOVE ペイロードの値が一致するかを判定する
 * NaN 同士も同一とみなし，未量子化の非有限値でも重複送信を抑止する
 */
export const isSameMovePayload = (
  left: Readonly<MovePayload>,
  right: Readonly<MovePayload>,
): boolean => {
  return isSameMoveAxis(left.x, right.x) && isSameMoveAxis(left.y, right.y);
};

// 0 と -0 は同一，NaN 同士も同一として軸の値を比較する
const isSameMoveAxis = (left: number, right: number): boolean => {
  return left === right || (Number.isNaN(left) && Number.isNaN(right));
};

// 不正なスケールは既定スケールへ寄せ，必ず量子化を通す
const resolveQuantizeScale = (scale: number): number => {
  if (!Number.isFinite(scale) || scale <= 0) {
    return DEFAULT_MOVE_QUANTIZE_SCALE;
  }

  return scale;
};

const quantizeMoveAxis = (value: number, scale: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const resolvedScale = resolveQuantizeScale(scale);

  // +0 を加算して -0 を 0 に正規化する（送信値の表現ゆれを避ける）
  return Math.round(value * resolvedScale) / resolvedScale + 0;
};
