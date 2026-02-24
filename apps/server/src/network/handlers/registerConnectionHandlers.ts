/**
 * registerConnectionHandlers
 * 接続時にルームとゲームの各ハンドラを登録する
 */
import { Server, Socket } from "socket.io";
import type {
  DisconnectPlayerPort,
  MovePlayerPort,
  ReadyForGamePort,
  ReadyForGameRoomPort,
  StartGamePort,
  StartGameRoomPort,
} from "@server/domains/game/application/ports/gameUseCasePorts";
import type {
  DisconnectRoomPort,
  FindRoomByPlayerPort,
  JoinRoomPort,
} from "@server/domains/room/application/ports/roomUseCasePorts";
import { protocol } from "@repo/shared";
import { registerRoomHandlers } from "./RoomHandler";
import { registerGameHandlers } from "./GameHandler";
import { logEvent } from "@server/logging/logEvent";
import { disconnectCoordinator } from "@server/application/coordinators/disconnectCoordinator";
import { createGameDisconnectOutputAdapter } from "./game/createGameOutputAdapter";
import { createRoomDisconnectOutputAdapter } from "./room/createRoomOutputAdapter";

type ConnectionGamePort =
  & StartGamePort
  & ReadyForGamePort
  & MovePlayerPort;

type DisconnectGamePort = DisconnectPlayerPort;

type ConnectionRoomPort =
  & JoinRoomPort
  & StartGameRoomPort
  & ReadyForGameRoomPort;

type DisconnectRoomHandlerPort = DisconnectRoomPort & FindRoomByPlayerPort;

type RegisterConnectionHandlersParams = {
  io: Server;
  gameManager: ConnectionGamePort & DisconnectGamePort;
  roomManager: ConnectionRoomPort & DisconnectRoomHandlerPort;
};

/** ソケット接続と切断イベントに対する共通ハンドラを登録する */
export const registerConnectionHandlers = ({
  io,
  gameManager,
  roomManager,
}: RegisterConnectionHandlersParams) => {
  const gameDisconnectOutputAdapter = createGameDisconnectOutputAdapter(io);
  const roomDisconnectOutputAdapter = createRoomDisconnectOutputAdapter(io);
  const connectionGameManager: ConnectionGamePort = gameManager;
  const disconnectGameManager: DisconnectGamePort = gameManager;
  const connectionRoomManager: ConnectionRoomPort = roomManager;
  const disconnectRoomManager: DisconnectRoomHandlerPort = roomManager;

  io.on(protocol.SocketEvents.CONNECT, (socket: Socket) => {
    // 接続ログを記録してドメイン別ハンドラを登録する
    logEvent("Network", {
      event: "CONNECT",
      result: "connected",
      socketId: socket.id,
    });

    registerRoomHandlers(io, socket, connectionRoomManager);
    registerGameHandlers(io, socket, connectionGameManager, connectionRoomManager);

    socket.on(protocol.SocketEvents.DISCONNECT, () => {
      // 切断ログ記録後にドメイン別の後処理を実行する
      logEvent("Network", {
        event: "DISCONNECT",
        result: "disconnected",
        socketId: socket.id,
      });

      disconnectCoordinator({
        socketId: socket.id,
        gameManager: disconnectGameManager,
        roomManager: disconnectRoomManager,
        gameOutput: gameDisconnectOutputAdapter,
        roomOutput: roomDisconnectOutputAdapter,
      });
    });
  });
};
