/**
 * teamValidators
 * チーム設定に対する検証関数を定義する
 * 設定値と参照IDの整合性検査を集約する
 */
import { GAME_CONFIG, TEAM_NAMES, UNKNOWN_TEAM_ID } from "./gameConfig";

/** teamId が unknown を表す値か判定する */
export const isUnknownTeamId = (teamId: number): boolean => {
  return teamId === UNKNOWN_TEAM_ID;
};

/** teamId が有効範囲内かを真偽値で判定する */
export const isKnownTeamId = (teamId: number): boolean => {
  return (
    Number.isInteger(teamId) && teamId >= 0 && teamId < GAME_CONFIG.TEAM_COUNT
  );
};

/** TEAM_COUNT と TEAM_NAMES の整合性を検証する */
export const validateTeamConfig = (): void => {
  const { TEAM_COUNT } = GAME_CONFIG;

  if (TEAM_NAMES.length !== TEAM_COUNT) {
    throw new Error(
      `GAME_CONFIG mismatch: TEAM_NAMES length (${TEAM_NAMES.length}) must equal TEAM_COUNT (${TEAM_COUNT})`,
    );
  }
};

/** teamId が有効範囲内かを検証する */
export const assertValidTeamId = (teamId: number): void => {
  validateTeamConfig();

  const { TEAM_COUNT } = GAME_CONFIG;
  if (!Number.isInteger(teamId) || teamId < 0 || teamId >= TEAM_COUNT) {
    throw new Error(`Invalid teamId: ${teamId}`);
  }
};
