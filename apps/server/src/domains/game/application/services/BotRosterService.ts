/**
 * BotRosterService
 * 4チームの人数差をなくすためのBot ID補充ロジックを提供する
 */
import { config } from "@server/config";

const BOT_PLAYER_ID_PREFIX = "bot:";

/** BotプレイヤーIDかどうかを判定する */
export const isBotPlayerId = (playerId: string): boolean => {
  return playerId.startsWith(BOT_PLAYER_ID_PREFIX);
};

const getRequiredBotCount = (humanPlayerCount: number): number => {
  const teamCount = config.GAME_CONFIG.TEAM_COUNT;
  if (teamCount <= 0) {
    return 0;
  }

  const remainder = humanPlayerCount % teamCount;
  if (remainder === 0) {
    return 0;
  }

  return teamCount - remainder;
};

/**
 * 人間プレイヤーIDに必要数のBot IDを補充し，チーム人数差が0になる構成を返す
 */
export const createBalancedSessionPlayerIds = (
  roomId: string,
  humanPlayerIds: string[],
): string[] => {
  const requiredBotCount = getRequiredBotCount(humanPlayerIds.length);
  if (requiredBotCount === 0) {
    return [...humanPlayerIds];
  }

  const botIds = Array.from({ length: requiredBotCount }, (_, index) => {
    return `${BOT_PLAYER_ID_PREFIX}${roomId}:${index + 1}`;
  });

  return [...humanPlayerIds, ...botIds];
};
