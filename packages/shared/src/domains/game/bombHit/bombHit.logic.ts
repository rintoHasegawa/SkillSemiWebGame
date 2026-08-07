/**
 * bombHit.logic
 * 爆弾とプレイヤーの円当たり判定を行う純関数を提供する
 * 同チーム無効判定と collision の重なり判定をまとめて扱う
 */
import { isUnknownTeamId } from "../../../config/teamValidators";
import { checkCircleOverlap } from "../collision";
import type { BombHitCheckInput, BombHitCheckResult } from "./bombHit.type";

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
