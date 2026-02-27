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

type HumanPlayerBinding = {
  socketId: string;
  playerId: string;
};

const excludeRecipientFromPlayerUpdates = <TPlayerUpdate extends { id: string }>(
  playerUpdates: TPlayerUpdate[],
  recipientPlayerId: string,
): TPlayerUpdate[] => {
  return playerUpdates.filter(
    (playerUpdate) => playerUpdate.id !== recipientPlayerId,
  );
};

type StartGameUseCaseParams = {
  roomId: string;
  playerIds: string[];
  playerNamesById: Record<string, string>;
  humanPlayerBindings?: HumanPlayerBinding[];
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
  humanPlayerBindings,
  gameSession,
  bombStore,
  onGameEnd,
  output,
}: StartGameUseCaseParams) => {
  const bindings = humanPlayerBindings ??
    playerIds.map((playerId) => ({ socketId: playerId, playerId }));

  const handleBotBombAction = createBotBombActionHandler({
    roomId,
    bombStore,
    output,
  });

  gameSession.startRoomSession(
    playerIds,
    playerNamesById,
    (tickData) => {
      if (tickData.playerUpdates.length > 0) {
        bindings.forEach(({ socketId, playerId }) => {
          const updatesForPlayer = excludeRecipientFromPlayerUpdates(
            tickData.playerUpdates,
            playerId,
          );

          if (updatesForPlayer.length === 0) {
            return;
          }

          output.publishUpdatePlayersToSocket(socketId, updatesForPlayer);
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
  bindings.forEach(({ socketId, playerId }) => {
    output.publishGameStartToSocketById(socketId, {
      startTime,
      myPlayerId: playerId,
    });
  });
};
