/**
 * startGameUseCase
 * ルーム内プレイヤーでゲームセッションを開始し，進行イベントを通知する
 */
import type {
  BombPlacementPort,
  StartGameOutputPort,
  StartGamePort,
} from "../ports/gameUseCasePorts";
import type { domain } from "@repo/shared";
import { logEvent } from "@server/logging/logger";
import {
  gameUseCaseLogEvents,
  logResults,
  logScopes,
} from "@server/logging/index";
import { createBotBombActionHandler } from "../services/bot/index.js";

const excludeRecipientFromPlayerUpdates = <
  TPlayerUpdate extends { id: string },
>(
  playerUpdates: TPlayerUpdate[],
  recipientId: string,
): TPlayerUpdate[] => {
  return playerUpdates.filter(
    (playerUpdate) => playerUpdate.id !== recipientId,
  );
};

const mapPlayerUpdatesToClientVisibleIds = (
  playerUpdates: domain.game.PlayerPositionUpdate[],
  mapPlayerIdToClientVisibleId: (playerId: string) => string,
): domain.game.PlayerPositionUpdate[] => {
  return playerUpdates.map((playerUpdate) => {
    return {
      ...playerUpdate,
      id: mapPlayerIdToClientVisibleId(playerUpdate.id),
    };
  });
};

type StartGameUseCaseParams = {
  roomId: string;
  playerIds: string[];
  playerNamesById: Record<string, string>;
  recipientPlayerIds?: string[];
  gameSession: StartGamePort;
  bombStore: BombPlacementPort;
  mapPlayerIdToClientVisibleId?: (playerId: string) => string;
  onGameEnd: () => void;
  output: StartGameOutputPort;
};

/** ゲームセッション開始とティック通知，終了通知を実行する */
export const startGameUseCase = ({
  roomId,
  playerIds,
  playerNamesById,
  recipientPlayerIds,
  gameSession,
  bombStore,
  mapPlayerIdToClientVisibleId,
  onGameEnd,
  output,
}: StartGameUseCaseParams) => {
  const resolveClientVisibleId =
    mapPlayerIdToClientVisibleId ?? ((playerId: string) => playerId);
  const updateRecipients =
    recipientPlayerIds ?? playerIds.map((playerId) => resolveClientVisibleId(playerId));
  const handleBotBombAction = createBotBombActionHandler({
    roomId,
    bombStore,
    resolveClientVisiblePlayerId: resolveClientVisibleId,
    output,
  });

  gameSession.startRoomSession(
    playerIds,
    playerNamesById,
    (tickData) => {
      const mappedPlayerUpdates = mapPlayerUpdatesToClientVisibleIds(
        tickData.playerUpdates,
        resolveClientVisibleId,
      );

      if (mappedPlayerUpdates.length > 0) {
        updateRecipients.forEach((playerId) => {
          const updatesForPlayer = excludeRecipientFromPlayerUpdates(
            mappedPlayerUpdates,
            playerId,
          );

          if (updatesForPlayer.length === 0) {
            return;
          }

          output.publishUpdatePlayersToSocket(playerId, updatesForPlayer);
        });
      }

      if (tickData.cellUpdates.length > 0) {
        output.publishMapCellUpdatesToRoom(roomId, tickData.cellUpdates);
      }
    },
    (resultPayload) => {
      logEvent(logScopes.GAME_USE_CASE, {
        event: gameUseCaseLogEvents.GAME_END,
        result: logResults.EMITTED,
        roomId,
        reason: "duration_elapsed",
      });
      output.publishGameEndToRoom(roomId);
      output.publishGameResultToRoom(roomId, resultPayload);
      onGameEnd();
    },
    handleBotBombAction,
  );

  const startTime = gameSession.getRoomStartTime() || Date.now();
  output.publishGameStartToRoom(roomId, { startTime });
};
