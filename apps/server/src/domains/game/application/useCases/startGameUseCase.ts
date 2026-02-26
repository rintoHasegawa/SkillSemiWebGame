/**
 * startGameUseCase
 * ルーム内プレイヤーでゲームセッションを開始し，進行イベントを通知する
 */
import type {
  BombOutputPort,
  GameOutputPort,
  StartGamePort,
} from "../ports/gameUseCasePorts";
import { logEvent } from "@server/logging/logger";
import {
  gameUseCaseLogEvents,
  logResults,
  logScopes,
} from "@server/logging/index";
import { placeBombUseCase } from "./placeBombUseCase";

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
  recipientPlayerIds?: string[];
  gameManager: StartGamePort;
  onGameEnd: () => void;
  output: Pick<
    GameOutputPort,
    | "publishUpdatePlayersToSocket"
    | "publishMapCellUpdatesToRoom"
    | "publishGameEndToRoom"
    | "publishGameResultToRoom"
    | "publishGameStartToRoom"
  > &
    Pick<
      BombOutputPort,
      "publishBombPlacedToOthersInRoom" | "publishBombPlacedAckToSocket"
    >;
};

/** ゲームセッション開始とティック通知，終了通知を実行する */
export const startGameUseCase = ({
  roomId,
  playerIds,
  recipientPlayerIds,
  gameManager,
  onGameEnd,
  output,
}: StartGameUseCaseParams) => {
  const updateRecipients = recipientPlayerIds ?? playerIds;

  gameManager.startRoomSession(
    playerIds,
    (tickData) => {
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
    (ownerId, payload) => {
      placeBombUseCase({
        roomId,
        bombStore: gameManager,
        input: {
          socketId: ownerId,
          payload,
          nowMs: Date.now(),
        },
        output,
      });
    },
  );

  const startTime = gameManager.getRoomStartTime() || Date.now();
  output.publishGameStartToRoom(roomId, { startTime });
};
