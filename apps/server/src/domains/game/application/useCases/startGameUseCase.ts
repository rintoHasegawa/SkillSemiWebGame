/**
 * startGameUseCase
 * ルーム内プレイヤーでゲームセッションを開始し，進行イベントを通知する
 */
import type {
  BombPlacementPort,
  GameFieldConfig,
  StartGameOutputPort,
  StartGamePort,
} from "../ports/gameUseCasePorts";
import { config } from "@server/config";
import { logEvent } from "@server/logging/logger";
import {
  gameUseCaseLogEvents,
  logResults,
  logScopes,
} from "@server/logging/index";
import { createBotBombActionHandler } from "../services/bot/index.js";

type StartGameUseCaseParams = {
  roomId: string;
  fieldConfig: GameFieldConfig;
  playerIds: string[];
  playerNamesById: Record<string, string>;
  teamPreferences?: Record<string, number | null>;
  gameSession: StartGamePort;
  bombStore: BombPlacementPort;
  onGameEnd: () => void;
  output: StartGameOutputPort;
};

type TickUpdatePublishParams = {
  roomId: string;
  output: StartGameOutputPort;
  tickData: Parameters<StartGamePort["startRoomSession"]>[3] extends {
    onTick: (data: infer TTickData) => void;
  }
    ? TTickData
    : never;
};

type TickPublishStep = {
  key: "currentHurricanes" | "updateHurricanes" | "player" | "map";
  run: (params: TickUpdatePublishParams) => void;
};

const TICK_PUBLISH_STEPS: TickPublishStep[] = [
  {
    key: "currentHurricanes",
    run: ({ roomId, output, tickData }) => {
      if (tickData.hurricaneSync.currentUpdates.length === 0) {
        return;
      }

      output.publishCurrentHurricanesToRoom(
        roomId,
        tickData.hurricaneSync.currentUpdates,
      );
    },
  },
  {
    key: "updateHurricanes",
    run: ({ roomId, output, tickData }) => {
      // 消滅ハリケーンの同期解除も送信側で判断するため，差分が空でも生存IDごと委譲する
      output.publishUpdateHurricanesToRoom(
        roomId,
        tickData.hurricaneSync.updateUpdates,
        tickData.hurricaneSync.activeHurricaneIds,
      );
    },
  },
  {
    key: "player",
    run: ({ roomId, output, tickData }) => {
      output.publishUpdatePlayersToRoom(roomId, tickData.playerUpdates);
    },
  },
  {
    key: "map",
    run: ({ roomId, output, tickData }) => {
      if (tickData.cellUpdates.length === 0) {
        return;
      }

      output.publishMapCellUpdatesToRoom(roomId, tickData.cellUpdates);
    },
  },
];

const publishTickUpdates = ({
  roomId,
  output,
  tickData,
}: TickUpdatePublishParams): void => {
  const params: TickUpdatePublishParams = {
    roomId,
    output,
    tickData,
  };

  TICK_PUBLISH_STEPS.forEach((step) => {
    step.run(params);
  });
};

/** ゲームセッション開始とティック通知，終了通知を実行する */
export const startGameUseCase = ({
  roomId,
  fieldConfig,
  playerIds,
  playerNamesById,
  teamPreferences,
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

  gameSession.startRoomSession(
    playerIds,
    playerNamesById,
    {
      ...fieldConfig,
    },
    {
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
    },
    teamPreferences,
  );

  // セッション開始直後のため未確定になることは無いが，念のため開始待機ぶんの負値へ倒す
  const serverElapsedMs =
    gameSession.getRoomSignedElapsedMs() ??
    -config.GAME_CONFIG.GAME_START_DELAY_MS;
  const sessionFieldConfig = gameSession.getRoomFieldConfig() ?? fieldConfig;
  output.publishGameStartToRoom(roomId, {
    serverElapsedMs,
    fieldSizePreset: sessionFieldConfig.fieldSizePreset,
    gridCols: sessionFieldConfig.gridCols,
    gridRows: sessionFieldConfig.gridRows,
  });
};
