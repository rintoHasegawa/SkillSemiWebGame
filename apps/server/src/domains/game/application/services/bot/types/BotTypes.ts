/**
 * BotTypes
 * Bot行動決定で利用する型定義を提供する
 */
import type { PlaceBombPayload } from "@repo/shared";

/** Botの内部状態 */
export type BotState = {
  targetCol: number;
  targetRow: number;
  /** 直近で爆弾を設置したゲーム経過ms */
  lastBombPlacedAtElapsedMs: number;
  bombSeq: number;
};

/** 移動先のグリッド座標 */
export type BotTarget = {
  col: number;
  row: number;
};

/** 1tick分のBot行動決定結果 */
export type BotDecision = {
  nextX: number;
  nextY: number;
  placeBombPayload: PlaceBombPayload | null;
};
