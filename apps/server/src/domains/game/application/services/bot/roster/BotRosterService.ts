/**
 * BotRosterService
 * チーム人数差を埋めるためのBotプレイヤーID補充ロジックを提供する
 */
import { config } from "@server/config";

const BOT_PLAYER_ID_PREFIX = "bot:";
declare const botPlayerIdBrand: unique symbol;

/** BotプレイヤーIDのブランド型 */
export type BotPlayerId = string & { readonly [botPlayerIdBrand]: true };

/** BotプレイヤーIDを生成する */
const createBotPlayerId = (
  roomId: string,
  serialNumber: number,
): BotPlayerId => {
  return `${BOT_PLAYER_ID_PREFIX}${roomId}:${serialNumber}` as BotPlayerId;
};

/** BotプレイヤーIDかどうかを判定する */
export const isBotPlayerId = (playerId: string): playerId is BotPlayerId => {
  return playerId.startsWith(BOT_PLAYER_ID_PREFIX);
};

const getMinimumTotalPlayers = (humanPlayerCount: number): number => {
  const teamCount = config.GAME_CONFIG.TEAM_COUNT;
  if (teamCount <= 0) {
    return humanPlayerCount;
  }

  const remainder = humanPlayerCount % teamCount;
  if (remainder === 0) {
    return humanPlayerCount;
  }

  return humanPlayerCount + (teamCount - remainder);
};

const resolveTargetTotalPlayers = (
  humanPlayerCount: number,
  requestedPlayerCount: number | undefined,
): number => {
  const minimumTotal = getMinimumTotalPlayers(humanPlayerCount);
  const teamCount = config.GAME_CONFIG.TEAM_COUNT;
  const maxTotal = config.GAME_CONFIG.MAX_PLAYERS_PER_ROOM;

  if (
    requestedPlayerCount === undefined ||
    teamCount <= 0 ||
    requestedPlayerCount > maxTotal ||
    requestedPlayerCount < minimumTotal ||
    requestedPlayerCount % teamCount !== 0
  ) {
    return minimumTotal;
  }

  return requestedPlayerCount;
};

const getRequiredBotCount = (
  humanPlayerCount: number,
  requestedPlayerCount: number | undefined,
): number => {
  const totalPlayers = resolveTargetTotalPlayers(
    humanPlayerCount,
    requestedPlayerCount,
  );
  return Math.max(0, totalPlayers - humanPlayerCount);
};

/** 人間プレイヤーIDへ必要数のBot IDを補充した配列を返す */
export const createBalancedSessionPlayerIds = (
  roomId: string,
  humanPlayerIds: string[],
  requestedPlayerCount?: number,
): string[] => {
  const requiredBotCount = getRequiredBotCount(
    humanPlayerIds.length,
    requestedPlayerCount,
  );
  if (requiredBotCount === 0) {
    return [...humanPlayerIds];
  }

  const botIds = Array.from({ length: requiredBotCount }, (_, index) => {
    return createBotPlayerId(roomId, index + 1);
  });

  return [...humanPlayerIds, ...botIds];
};
