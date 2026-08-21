/**
 * targetPlayerCount
 * ロビーで設定する目標人数（targetPlayerCount）の仕様判定を集約する
 * client の選択肢生成と server の受け入れ検証で同じ式を共有し，判定のズレを防ぐ
 */
import { GAME_CONFIG } from "../../config/gameConfig";

/** 目標人数の刻み幅（4チームへ均等分割するための単位） */
export const TARGET_PLAYER_COUNT_UNIT = GAME_CONFIG.TEAM_COUNT;

/** 目標人数の下限（全チームに1人ずつ配置できる最小人数） */
export const MIN_TARGET_PLAYER_COUNT = GAME_CONFIG.TEAM_COUNT;

/** 目標人数が刻み幅（4の倍数）の正の整数かを判定する */
export const isTargetPlayerCountUnit = (targetPlayerCount: number): boolean => {
  return (
    Number.isInteger(targetPlayerCount)
    && targetPlayerCount > 0
    && targetPlayerCount % TARGET_PLAYER_COUNT_UNIT === 0
  );
};

/**
 * 目標人数がルームで受け入れ可能な値かを判定する
 * サーバが受け入れる仕様（SPEC_02）は「4 <= n <= maxPlayers かつ 4 の倍数」とする
 * SPEC_02 の「最小は現在の参加人数を4の倍数に切り上げ」はUI表示上の制約であり，
 * サーバでは検証中に参加人数が減るレースが起きるため強制しない
 * 下限判定は刻み幅と下限が将来分かれても仕様を保てるよう明示的に残す
 */
export const isValidTargetPlayerCount = (
  targetPlayerCount: number,
  maxPlayers: number,
): boolean => {
  return (
    isTargetPlayerCountUnit(targetPlayerCount)
    && targetPlayerCount >= MIN_TARGET_PLAYER_COUNT
    && targetPlayerCount <= maxPlayers
  );
};

/** 現在の参加人数から選択可能な目標人数の下限を求める（4の倍数へ切り上げ） */
export const resolveMinTargetPlayerCount = (
  currentPlayerCount: number,
): number => {
  return Math.max(MIN_TARGET_PLAYER_COUNT, ceilToUnit(currentPlayerCount));
};

/**
 * ルーム上限から選択可能な目標人数の上限を求める（4の倍数へ切り下げ）
 * ルーム上限が4の倍数でない場合は4の倍数へ切り下げる
 * 参加人数が上限を超えている異常時も下限を下回らないようにする
 */
export const resolveMaxTargetPlayerCount = (
  currentPlayerCount: number,
  maxPlayers: number,
): number => {
  return Math.max(
    resolveMinTargetPlayerCount(currentPlayerCount),
    floorToUnit(maxPlayers),
  );
};

/** 下限から上限までの目標人数の選択肢を4人刻みで生成する */
export const createTargetPlayerCountOptions = (
  currentPlayerCount: number,
  maxPlayers: number,
): number[] => {
  const min = resolveMinTargetPlayerCount(currentPlayerCount);
  const max = resolveMaxTargetPlayerCount(currentPlayerCount, maxPlayers);

  const options: number[] = [];
  for (let count = min; count <= max; count += TARGET_PLAYER_COUNT_UNIT) {
    options.push(count);
  }

  return options;
};

// 刻み幅（4）の倍数へ切り上げる
const ceilToUnit = (value: number): number => {
  return Math.ceil(value / TARGET_PLAYER_COUNT_UNIT) * TARGET_PLAYER_COUNT_UNIT;
};

// 刻み幅（4）の倍数へ切り下げる
const floorToUnit = (value: number): number => {
  return (
    Math.floor(value / TARGET_PLAYER_COUNT_UNIT) * TARGET_PLAYER_COUNT_UNIT
  );
};
