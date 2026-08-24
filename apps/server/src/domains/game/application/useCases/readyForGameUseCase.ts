/**
 * readyForGameUseCase
 * READY_FOR_GAME受信時に現在プレイヤー状態とゲーム経過時間を返却する
 */
import type { ReadyForGamePort } from "../ports/gameUseCasePorts";
import type { GameOutputPort } from "../ports/gameUseCasePorts";
import { config } from "@server/config";
import { logEvent } from "@server/logging/logger";
import { config as sharedConfig } from "@repo/shared";
import { gameUseCaseLogEvents, logResults, logScopes } from "@server/logging/index";
import { buildCurrentPlayersBootstrapPayload } from "../services/currentPlayersBootstrapBuilder";

type ReadyForGameUseCaseParams = {
  socketId: string;
  roomId?: string;
  gameManager?: ReadyForGamePort;
  output: Pick<GameOutputPort, "publishCurrentPlayersToSocket" | "publishGameStartToSocket">;
};

/** 準備完了通知に対してルーム状態を返却し，セッション進行中ならゲーム経過時間も通知する */
export const readyForGameUseCase = ({
  socketId,
  roomId,
  gameManager,
  output,
}: ReadyForGameUseCaseParams) => {
  if (!roomId || !gameManager) {
    output.publishCurrentPlayersToSocket([]);
    logEvent(logScopes.GAME_USE_CASE, {
      event: gameUseCaseLogEvents.READY_FOR_GAME,
      result: logResults.IGNORED_MISSING_ROOM,
      socketId,
    });
    return;
  }

  const roomPlayers = gameManager.getRoomPlayers();
  const playerMetas = buildCurrentPlayersBootstrapPayload(socketId, roomPlayers);
  output.publishCurrentPlayersToSocket(playerMetas);

  logEvent(logScopes.GAME_USE_CASE, {
    event: gameUseCaseLogEvents.READY_FOR_GAME,
    result: logResults.RECEIVED,
    socketId,
    roomId,
    totalPlayers: roomPlayers.length,
  });

  // カウントダウン中は負値になるため未開始判定は undefined のみで行う
  const serverElapsedMs = gameManager.getRoomSignedElapsedMs();
  if (serverElapsedMs === undefined) {
    return;
  }

  const fieldConfig = gameManager.getRoomFieldConfig();

  output.publishGameStartToSocket({
    roomId,
    serverElapsedMs,
    fieldSizePreset:
      fieldConfig?.fieldSizePreset ?? config.GAME_CONFIG.DEFAULT_FIELD_PRESET,
    gridCols:
      fieldConfig?.gridCols
      ?? sharedConfig.resolveFieldGridSize(
        config.GAME_CONFIG.DEFAULT_FIELD_PRESET,
      ).cols,
    gridRows:
      fieldConfig?.gridRows
      ?? sharedConfig.resolveFieldGridSize(
        config.GAME_CONFIG.DEFAULT_FIELD_PRESET,
      ).rows,
  });
  logEvent(logScopes.GAME_USE_CASE, {
    event: gameUseCaseLogEvents.GAME_START,
    result: logResults.EMITTED,
    socketId,
    roomId,
    serverElapsedMs,
  });
};
