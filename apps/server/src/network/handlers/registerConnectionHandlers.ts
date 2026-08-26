/**
 * registerConnectionHandlers
 * 接続時にルームとゲームの各ハンドラを登録する
 * 切断時はゲーム進行中のプレイヤーに限り，復帰用のセッション予約を残す
 */
import { Socket } from "socket.io";
import { contracts as protocol } from "@repo/shared";
import { disconnectCoordinator } from "@server/application/coordinators/disconnectCoordinator";
import { createRealtimeRoomSyncStateStore } from "@server/network/adapters/realtimeRoomSyncState";
import { resolveSessionToken } from "@server/network/identity";
import { registerGameHandlers } from "./game/registerGameHandlers";
import { registerRoomHandlers } from "./room/registerRoomHandlers";
import { createDisconnectOutputAdapters } from "./createOutputAdapters";
import { collectSessionReservationEntry } from "./disconnectSessionReservation";
import { logConnected, logDisconnected } from "./connectionEventLogger";
import { createConnectionRegistrationContext } from "./registration";
import {
  registerEvent,
  registerUnguardedEvent,
  type EventDefinition,
  type UnguardedEventDefinition,
} from "./eventDefinitionRegistrar";
import type { RegisterConnectionHandlersParams } from "../types/connectionPorts";

/** ソケット接続と切断イベントに対する共通ハンドラを登録する */
export const registerConnectionHandlers = ({
  io,
  roomManager,
  runtimeRegistry,
  identityRegistry,
  sessionReservations,
}: RegisterConnectionHandlersParams) => {
  const disconnectOutputAdapters = createDisconnectOutputAdapters(io);
  // 高頻度同期のソケット別キャッシュは接続間で共有し，切断時に個別解放する
  const realtimeRoomSyncState = createRealtimeRoomSyncStateStore();

  // CONNECTイベントを宣言的に登録する
  const onConnectEventDefinition: EventDefinition<
    typeof protocol.SocketEvents.CONNECT,
    Socket
  > = {
    event: protocol.SocketEvents.CONNECT,
    orchestrate: (socket) => {
      const { deps, socketOutputAdapters } = createConnectionRegistrationContext(
        {
          io,
          roomManager,
          runtimeRegistry,
          identityRegistry,
          sessionReservations,
        },
        socket,
        realtimeRoomSyncState,
      );

      // 接続ログを記録してドメイン別ハンドラを登録する
      logConnected(deps.socket.id);

      // ハンドシェイクのトークンは接続中不変のため，接続時に一度だけ解決する
      const sessionToken = resolveSessionToken(deps.socket);

      registerRoomHandlers({
        socket: deps.socket,
        roomManager: deps.roomManager,
        runtimeRegistry: deps.runtimeRegistry,
        roomOutputAdapter: socketOutputAdapters.room,
        identityRegistry: deps.identityRegistry,
        sessionReservations: deps.sessionReservations,
        sessionToken,
      });
      registerGameHandlers({
        socket: deps.socket,
        roomManager: deps.roomManager,
        runtimeRegistry: deps.runtimeRegistry,
        gameOutputAdapter: socketOutputAdapters.game,
        roomOutputAdapter: socketOutputAdapters.room,
        identityRegistry: deps.identityRegistry,
        sessionReservations: deps.sessionReservations,
      });

      // ソケット単位イベントを宣言的に登録する
      const perSocketEventDefinition: UnguardedEventDefinition<
        typeof protocol.SocketEvents.DISCONNECT
      > = {
        event: protocol.SocketEvents.DISCONNECT,
        orchestrate: () => {
          // 切断ログ記録後にドメイン別の後処理を実行する
          logDisconnected(deps.socket.id);

          const playerId = identityRegistry.resolvePlayerId(deps.socket.id);
          const reservationSource = {
            roomManager: deps.roomManager,
            runtimeRegistry: deps.runtimeRegistry,
          };
          // 退室処理を通すと名簿から引けなくなるため，調停の前に在籍情報を採取する
          // トークン未提示のソケットは照合できず復帰対象にならないため採取しない
          const reservationEntry = sessionToken
            ? collectSessionReservationEntry(reservationSource, playerId)
            : undefined;

          const { replacedWithBot } = disconnectCoordinator({
            socketId: playerId,
            roomManager: deps.roomManager,
            runtimeRegistry: deps.runtimeRegistry,
            gameOutput: disconnectOutputAdapters.game,
            roomOutput: disconnectOutputAdapters.room,
          });

          // ゲーム進行中でBot置換された場合のみ復帰用の席を残す
          if (sessionToken && reservationEntry && replacedWithBot) {
            sessionReservations.reserve(sessionToken, reservationEntry);
          }

          identityRegistry.release(deps.socket.id);

          // 離脱通知の配信後に，このソケット向けの同期キャッシュを解放する
          realtimeRoomSyncState.releaseSocket(playerId);
        },
      };

      registerUnguardedEvent(
        (event, callback) => {
          deps.socket.on(event, callback);
        },
        perSocketEventDefinition,
      );
    },
  };

  registerEvent(
    (event, callback) => {
      io.on(event, (socket) => {
        callback(socket);
      });
    },
    onConnectEventDefinition,
  );
};
