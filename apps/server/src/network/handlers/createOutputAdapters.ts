/**
 * createOutputAdapters
 * ソケット接続単位と切断処理単位の出力アダプタ生成を共通化する
 */
import type { Server, Socket } from "socket.io";
import type { RealtimeRoomSyncStateStore } from "@server/network/adapters/realtimeRoomSyncState";
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
import type {
  FindGameByRoomPort,
  FindRoomByIdPort,
} from "@server/domains/room/application/ports/roomUseCasePorts";

/** 接続単位で利用するゲームとルームの出力アダプタ集合 */
export type SocketOutputAdapters = {
  game: GameOutputAdapter;
  room: RoomOutputAdapter;
};

type GameOutputAdapterDeps = {
  roomManager: FindRoomByIdPort;
  runtimeRegistry: FindGameByRoomPort;
};

/** 接続ソケット向け出力アダプタ生成の引数 */
type CreateSocketOutputAdaptersParams = {
  io: Server;
  socket: Socket;
  deps: GameOutputAdapterDeps;
  /** 接続間で共有するサーバー単位の同期状態ストア */
  realtimeRoomSyncState: RealtimeRoomSyncStateStore;
};

/** 切断処理で利用するゲームとルームの出力アダプタ集合 */
type DisconnectOutputAdapters = {
  game: GameDisconnectOutputAdapter;
  room: Pick<RoomOutputAdapter, "publishRoomUpdateToRoom" | "closeRoomChannel">;
};

/**
 * 接続ソケット向けの出力アダプタを生成する
 * 同期状態ストアは接続間で共有するためサーバー単位のインスタンスを受け取る
 */
export const createSocketOutputAdapters = ({
  io,
  socket,
  deps,
  realtimeRoomSyncState,
}: CreateSocketOutputAdaptersParams): SocketOutputAdapters => {
  const common = createCommonHandlerContext(io, socket);

  return {
    game: createGameOutputAdapter(common, deps, realtimeRoomSyncState),
    room: createRoomOutputAdapter(common, io),
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
