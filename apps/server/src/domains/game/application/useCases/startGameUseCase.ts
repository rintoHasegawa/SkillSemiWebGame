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

type StartGameUseCaseParams = {
  roomId: string;
  playerIds: string[];
  playerNamesById: Record<string, string>;
  gameSession: StartGamePort;
  bombStore: BombPlacementPort;
  onGameEnd: () => void;
  output: StartGameOutputPort;
};

type TickUpdatePublishParams = {
  roomId: string;
  output: StartGameOutputPort;
  tickData: Parameters<StartGamePort["startRoomSession"]>[2] extends {
    onTick: (data: infer TTickData) => void;
  }
    ? TTickData
    : never;
};

const publishTickUpdates = ({
  roomId,
  output,
  tickData,
}: TickUpdatePublishParams): void => {
  if (tickData.playerUpdates.length > 0) {
    output.publishUpdatePlayersToRoom(roomId, tickData.playerUpdates);
  }

  if (tickData.cellUpdates.length > 0) {
    output.publishMapCellUpdatesToRoom(roomId, tickData.cellUpdates);
  }

  if (tickData.hurricaneUpdates.length > 0) {
    output.publishUpdateHurricanesToRoom(roomId, tickData.hurricaneUpdates);
  }
};

/** ゲームセッション開始とティック通知，終了通知を実行する */
export const startGameUseCase = ({
  roomId,
  playerIds,
  playerNamesById,
  gameSession,
  bombStore,
  onGameEnd,
  output,
}: StartGameUseCaseParams) => {
  const handleBotBombAction = createBotBombActionHandler({
    roomId,
    bombStore,
    output,
  });

  /** Bot被弾検出時にPLAYER_HITをルームへ配信する */
  const handleBotBombHit = (targetPlayerId: string, _bombId: string): void => {
    output.publishPlayerHitToOthersInRoom(roomId, targetPlayerId, {
      playerId: targetPlayerId,
    });
  };

  gameSession.startRoomSession(playerIds, playerNamesById, {
    onTick: (tickData) => {
      publishTickUpdates({ roomId, output, tickData });
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
    onHurricanePlayerHit: (targetPlayerId) => {
      output.publishHurricaneHitToRoom(roomId, {
        playerId: targetPlayerId,
      });
    },
  });

  const startTime = gameSession.getRoomStartTime() || Date.now();
  output.publishGameStartToRoom(roomId, { startTime, serverNow: Date.now() });
};
