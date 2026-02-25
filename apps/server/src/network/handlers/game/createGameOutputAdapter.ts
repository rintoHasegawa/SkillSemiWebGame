/**
 * createGameOutputAdapter
 * ゲーム系ユースケースから利用する送信関数群を生成する
 */
import { Server } from "socket.io";
import { protocol } from "@repo/shared";
import type { gridMapTypes, playerTypes, roomTypes, UpdatePlayersPayload } from "@repo/shared";
import type { GameOutputPort } from "@server/domains/game/application/ports/gameUseCasePorts";
import { createEmitToRoom } from "@server/network/adapters/socketEmitters";
import type { CommonHandlerContext } from "../CommonHandler";

type RoomId = roomTypes.Room["roomId"];
type SocketId = playerTypes.PlayerData["id"];
type PongPayload = { clientTime: number; serverTime: number };
type GameStartPayload = { startTime: number };
type CurrentPlayersPayload = playerTypes.PlayerData[];
type MapCellUpdatesPayload = gridMapTypes.CellUpdate[];

/** ゲーム出力アダプターのインターフェース */
export type GameOutputAdapter = Omit<GameOutputPort, "publishPlayerRemovedToRoom">;

/** ゲーム切断時の出力アダプターのインターフェース */
export type GameDisconnectOutputAdapter = Pick<GameOutputPort, "publishPlayerRemovedToRoom">;

/** 共通送信コンテキストからゲーム出力アダプターを生成する */
export const createGameOutputAdapter = (common: CommonHandlerContext): GameOutputAdapter => {
  return {
    publishPongToSocket: (payload: PongPayload) => {
      common.emitToSocket(protocol.SocketEvents.PONG, payload);
    },
    publishUpdatePlayersToRoom: (roomId: RoomId, players: UpdatePlayersPayload) => {
      common.emitToRoom(roomId, protocol.SocketEvents.UPDATE_PLAYERS, players);
    },
    publishMapCellUpdatesToRoom: (roomId: RoomId, cellUpdates: MapCellUpdatesPayload) => {
      common.emitToRoom(roomId, protocol.SocketEvents.UPDATE_MAP_CELLS, cellUpdates);
    },
    publishGameEndToRoom: (roomId: RoomId) => {
      common.emitToRoom(roomId, protocol.SocketEvents.GAME_END);
    },
    publishGameStartToRoom: (roomId: RoomId, payload: GameStartPayload) => {
      common.emitToRoom(roomId, protocol.SocketEvents.GAME_START, payload);
    },
    publishCurrentPlayersToSocket: (players: CurrentPlayersPayload) => {
      common.emitToSocket(protocol.SocketEvents.CURRENT_PLAYERS, players);
    },
    publishGameStartToSocket: (payload: GameStartPayload) => {
      common.emitToSocket(protocol.SocketEvents.GAME_START, payload);
    },
  };
};

/** ゲーム切断時の送信関数群を生成する */
export const createGameDisconnectOutputAdapter = (io: Server): GameDisconnectOutputAdapter => {
  const emitToRoom = createEmitToRoom(io);

  return {
    publishPlayerRemovedToRoom: (roomId: RoomId, removedPlayerId: SocketId) => {
      emitToRoom(roomId, protocol.SocketEvents.REMOVE_PLAYER, removedPlayerId);
    },
  };
};
