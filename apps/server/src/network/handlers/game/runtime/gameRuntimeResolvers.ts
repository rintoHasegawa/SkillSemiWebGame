/**
 * gameRuntimeResolvers
 * ゲーム送信処理で利用するルーム/ランタイム参照処理を提供する
 * 受信者ソケット一覧，プレイヤー一覧，アクティブ爆弾一覧の解決を集約する
 */
import type { domain } from "@repo/shared";
import type { ActiveBombSnapshot } from "@server/domains/game/application/ports/gameUseCasePorts";
import { isBotPlayerId } from "@server/domains/game/application/services/bot/index.js";
import type {
  FindGameByRoomPort,
  FindRoomByIdPort,
} from "@server/domains/room/application/ports/roomUseCasePorts";

/** ランタイム参照処理で利用する依存型 */
export type RuntimeResolverDeps = {
  roomManager: FindRoomByIdPort;
  runtimeRegistry: FindGameByRoomPort;
};

/** ルームの接続済み受信者ソケットID一覧を返す */
export const getConnectedSocketIdsInRoom = (
  deps: RuntimeResolverDeps,
  roomId: domain.room.Room["roomId"],
): string[] => {
  const room = deps.roomManager.getRoomById(roomId);
  if (!room) {
    return [];
  }

  return room.players
    .map((player) => player.id)
    .filter((playerId) => !isBotPlayerId(playerId));
};

/** ルーム内プレイヤー一覧を返す */
export const getRoomPlayers = (
  deps: RuntimeResolverDeps,
  roomId: domain.room.Room["roomId"],
): domain.game.player.PlayerData[] => {
  const gameManager = deps.runtimeRegistry.getGameManagerByRoomId(roomId);
  if (!gameManager) {
    return [];
  }

  return gameManager.getRoomPlayers();
};

/** ルーム内アクティブ爆弾スナップショット一覧を返す */
export const getActiveBombSnapshotsInRoom = (
  deps: RuntimeResolverDeps,
  roomId: domain.room.Room["roomId"],
): ActiveBombSnapshot[] => {
  const gameManager = deps.runtimeRegistry.getGameManagerByRoomId(roomId);
  if (!gameManager) {
    return [];
  }

  return gameManager.getActiveBombSnapshots();
};
