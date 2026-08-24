/**
 * bombHit.logic
 * 爆弾とプレイヤーの円当たり判定を行う純関数を提供する
 * 同チーム無効判定と collision の重なり判定をまとめて扱う
 * サーバーが被弾報告を受理する距離しきい値もここで一元管理する
 */
import { GAME_CONFIG } from "../../../config/gameConfig";
import { isUnknownTeamId } from "../../../config/teamValidators";
import { checkCircleOverlap } from "../collision";
import type {
  BombHitCheckInput,
  BombHitCheckResult,
  BombHitReportRangeInput,
} from "./bombHit.type";

/** 爆弾とプレイヤーの当たり判定を実行する */
export const checkBombHit = ({
  bomb,
  player,
}: BombHitCheckInput): BombHitCheckResult => {
  // 未確定teamId（UNKNOWN_TEAM_ID）は同一チームの根拠にならないため同チーム扱いしない
  const isSameTeam =
    bomb.teamId === player.teamId && !isUnknownTeamId(bomb.teamId);

  const { isOverlapping, distanceSquared, thresholdSquared } =
    checkCircleOverlap({ circleA: bomb, circleB: player });

  return {
    isHit: !isSameTeam && isOverlapping,
    isSameTeam,
    distanceSquared,
    thresholdSquared,
  };
};

/**
 * 被弾報告として受理する報告者と爆弾中心の最大距離（グリッド単位）
 * 爆風半径とプレイヤー半径の和に，時計同期誤差と移動補間のずれを吸収する
 * マージンを加えた値とする
 */
export const BOMB_HIT_REPORT_MAX_DISTANCE_GRID =
  GAME_CONFIG.BOMB_RADIUS_GRID
  + GAME_CONFIG.PLAYER_RADIUS
  + GAME_CONFIG.BOMB_HIT_REPORT_DISTANCE_MARGIN_GRID;

const BOMB_HIT_REPORT_MAX_DISTANCE_SQUARED =
  BOMB_HIT_REPORT_MAX_DISTANCE_GRID * BOMB_HIT_REPORT_MAX_DISTANCE_GRID;

/**
 * 被弾報告が受理可能な距離の内側かを判定する
 * 座標が非有限で距離を求められない場合は判定不能とみなし，
 * 正規プレイヤーの報告を落とさないよう受理側へ倒す
 */
export const isWithinBombHitReportRange = ({
  bomb,
  reporter,
}: BombHitReportRangeInput): boolean => {
  const deltaX = bomb.x - reporter.x;
  const deltaY = bomb.y - reporter.y;
  const distanceSquared = deltaX * deltaX + deltaY * deltaY;
  if (!Number.isFinite(distanceSquared)) {
    return true;
  }

  return distanceSquared <= BOMB_HIT_REPORT_MAX_DISTANCE_SQUARED;
};
