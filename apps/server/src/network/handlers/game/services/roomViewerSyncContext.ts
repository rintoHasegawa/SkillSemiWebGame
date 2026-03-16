/**
 * roomViewerSyncContext
 * ルーム内の受信者走査で使う共通コンテキストを提供する
 * SyncService間で重複する受信者解決処理を集約する
 */
import type { domain } from "@repo/shared";
import {
  getConnectedSocketIdsInRoom,
  getRoomPlayers,
  type RuntimeResolverDeps,
} from "../runtime/gameRuntimeResolvers";

type RoomId = domain.room.Room["roomId"];

type ViewerId = string;

/** ルーム受信者走査の実行入力 */
export type ForEachRoomViewerParams = {
  runtimeDeps: RuntimeResolverDeps;
  roomId: RoomId;
  run: (params: {
    viewerId: ViewerId;
    viewer: domain.game.player.PlayerData;
    roomPlayers: domain.game.player.PlayerData[];
  }) => void;
};

/** ルーム内の接続済み受信者を列挙し，各受信者ごとに処理を実行する */
export const forEachRoomViewer = ({
  runtimeDeps,
  roomId,
  run,
}: ForEachRoomViewerParams): void => {
  const roomPlayers = getRoomPlayers(runtimeDeps, roomId);
  if (roomPlayers.length === 0) {
    return;
  }

  const roomPlayerById = new Map(roomPlayers.map((player) => [player.id, player]));
  const recipientSocketIds = getConnectedSocketIdsInRoom(runtimeDeps, roomId);

  recipientSocketIds.forEach((viewerId) => {
    const viewer = roomPlayerById.get(viewerId);
    if (!viewer) {
      return;
    }

    run({
      viewerId,
      viewer,
      roomPlayers,
    });
  });
};
