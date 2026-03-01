/**
 * startGameUseCase
 * ルーム内プレイヤーでゲームセッションを開始し，進行イベントを通知する
 */
import type {
  BombPlacementPort,
  StartGameOutputPort,
  StartGamePort,
} from "../ports/gameUseCasePorts";
import { logEvent } from "@server/logging/logger";
import {
  gameUseCaseLogEvents,
  logResults,
  logScopes,
} from "@server/logging/index";
import { createBotBombActionHandler } from "../services/bot/index.js";
import { domain } from "@repo/shared";

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

type StartGameUseCaseParams = {
  roomId: string;
  playerIds: string[];
  playerNamesById: Record<string, string>;
  recipientPlayerIds?: string[];
  gameSession: StartGamePort;
  bombStore: BombPlacementPort;
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
  onGameEnd,
  output,
}: StartGameUseCaseParams) => {
  const updateRecipients = recipientPlayerIds ?? playerIds;
  const handleBotBombAction = createBotBombActionHandler({
    roomId,
    bombStore,
    output,
  });

  /** Bot被弾検出時にPLAYER_DEADをルームへ配信する */
  const handleBotBombHit = (targetPlayerId: string, _bombId: string): void => {
    output.publishPlayerDeadToOthersInRoom(roomId, targetPlayerId, {
      playerId: targetPlayerId,
    });
  };

  gameSession.startRoomSession(
    playerIds,
    playerNamesById,
    {
      onTick: (tickData) => {
        if (tickData.playerUpdates.length > 0) {
          updateRecipients.forEach((playerId) => {
            const updatesForPlayer = excludeRecipientFromPlayerUpdates(
              tickData.playerUpdates,
              playerId,
            );

            if (updatesForPlayer.length === 0) {
              return;
            }

            output.publishUpdatePlayersToSocket(playerId, updatesForPlayer);
          });
        }

        if (tickData.cellUpdates.length > 0) {
          output.publishMapCellUpdatesToRoom(
            roomId,
            domain.game.gridMap.groupCellUpdates(tickData.cellUpdates),
          );
        }
      },
      onGameEnd: (resultPayload) => {
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
      onBotPlaceBomb: handleBotBombAction,
      onBotBombHit: handleBotBombHit,
    },
  );

  const startTime = gameSession.getRoomStartTime() || Date.now();
  output.publishGameStartToRoom(roomId, { startTime, serverNow: Date.now() });
};
