/**
 * createOutputAdapters
 * ソケット接続単位と切断処理単位の出力アダプタ生成を共通化する
 */
import type { Server, Socket } from "socket.io";
import { createCommonHandlerContext } from "./CommonHandler";
import {
  createGameDisconnectOutputAdapter,
  createGameOutputAdapter,
  type GameDisconnectOutputAdapter,
  type GameOutputAdapter,
} from "./game/createGameOutputAdapter";
import {
  createRoomDisconnectOutputAdapter,
  createRoomOutputAdapter,
  type RoomOutputAdapter,
} from "./room/createRoomOutputAdapter";

/** 接続単位で利用するゲームとルームの出力アダプタ集合 */
export type SocketOutputAdapters = {
  game: GameOutputAdapter;
  room: RoomOutputAdapter;
};

/** 切断処理で利用するゲームとルームの出力アダプタ集合 */
export type DisconnectOutputAdapters = {
  game: GameDisconnectOutputAdapter;
  room: Pick<RoomOutputAdapter, "publishRoomUpdateToRoom">;
};

/** 接続ソケット向けの出力アダプタを生成する */
export const createSocketOutputAdapters = (
  io: Server,
  socket: Socket,
): SocketOutputAdapters => {
  const common = createCommonHandlerContext(io, socket);

  return {
    game: createGameOutputAdapter(common),
    room: createRoomOutputAdapter(common),
  };
};

/** 切断処理向けの出力アダプタを生成する */
export const createDisconnectOutputAdapters = (
  io: Server,
): DisconnectOutputAdapters => {
  return {
    game: createGameDisconnectOutputAdapter(io),
    room: createRoomDisconnectOutputAdapter(io),
  };
};
