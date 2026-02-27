/**
 * createGameOutputAdapter
 * ゲーム系ユースケースから利用する送信関数群を生成する
 */
import { Server } from "socket.io";
import { contracts as protocol } from "@repo/shared";
import type {
  BombPlacedAckPayload,
  BombPlacedPayload,
  domain,
  GameStartPayload,
  GameResultPayload,
  PlayerDeadPayload,
  PongPayload,
  CurrentPlayersPayload,
  RemovePlayerPayload,
  UpdateMapCellsPayload,
  UpdatePlayersPayload,
} from "@repo/shared";
import type {
  BombOutputPort,
  GameOutputPort,
} from "@server/domains/game/application/ports/gameUseCasePorts";
import { sanitizeUpdatePlayersPayload } from "@server/network/adapters/gamePayloadSanitizers";
import { createEmitToRoom } from "@server/network/adapters/socketEmitters";
import type { CommonHandlerContext } from "../CommonHandler";

type RoomId = domain.room.Room["roomId"];

/** ゲーム出力アダプターのインターフェース */
export type GameOutputAdapter = Omit<
  GameOutputPort,
  "publishPlayerRemovedToRoom"
> &
  BombOutputPort;

/** ゲーム切断時の出力アダプターのインターフェース */
export type GameDisconnectOutputAdapter = Pick<
  GameOutputPort,
  "publishPlayerRemovedToRoom"
>;

/** 共通送信コンテキストからゲーム出力アダプターを生成する */
export const createGameOutputAdapter = (
  common: CommonHandlerContext,
): GameOutputAdapter => {
  return {
    publishPongToSocket: (payload: PongPayload) => {
      common.emitToSocket(protocol.SocketEvents.PONG, payload);
    },
    publishUpdatePlayersToSocket: (
      socketId: string,
      players: UpdatePlayersPayload,
    ) => {
      const sanitizedPlayers = sanitizeUpdatePlayersPayload(players);
      common.emitToSocketById(
        socketId,
        protocol.SocketEvents.UPDATE_PLAYERS,
        sanitizedPlayers,
      );
    },
    publishMapCellUpdatesToRoom: (
      roomId: RoomId,
      cellUpdates: UpdateMapCellsPayload,
    ) => {
      common.emitToRoom(
        roomId,
        protocol.SocketEvents.UPDATE_MAP_CELLS,
        cellUpdates,
      );
    },
    publishGameEndToRoom: (roomId: RoomId) => {
      common.emitToRoom(roomId, protocol.SocketEvents.GAME_END);
    },
    publishGameResultToRoom: (roomId: RoomId, payload: GameResultPayload) => {
      common.emitToRoom(roomId, protocol.SocketEvents.GAME_RESULT, payload);
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
    publishBombPlacedToOthersInRoom: (
      roomId: RoomId,
      ownerSocketId: string,
      payload: BombPlacedPayload,
    ) => {
      if (ownerSocketId.startsWith("bot:")) {
        common.emitToRoom(roomId, protocol.SocketEvents.BOMB_PLACED, payload);
        return;
      }

      common.emitToRoomExceptSocket(
        roomId,
        ownerSocketId,
        protocol.SocketEvents.BOMB_PLACED,
        payload,
      );
    },
    publishBombPlacedAckToSocket: (
      socketId: string,
      payload: BombPlacedAckPayload,
    ) => {
      common.emitToSocketById(
        socketId,
        protocol.SocketEvents.BOMB_PLACED_ACK,
        payload,
      );
    },
    publishPlayerDeadToOthersInRoom: (
      roomId: RoomId,
      deadPlayerId: string,
      payload: PlayerDeadPayload,
    ) => {
      common.emitToRoomExceptSocket(
        roomId,
        deadPlayerId,
        protocol.SocketEvents.PLAYER_DEAD,
        payload,
      );
    },
  };
};

/** ゲーム切断時の送信関数群を生成する */
export const createGameDisconnectOutputAdapter = (
  io: Server,
): GameDisconnectOutputAdapter => {
  const emitToRoom = createEmitToRoom(io);

  return {
    publishPlayerRemovedToRoom: (
      roomId: RoomId,
      removedPlayerId: RemovePlayerPayload,
    ) => {
      emitToRoom(roomId, protocol.SocketEvents.REMOVE_PLAYER, removedPlayerId);
    },
  };
};
