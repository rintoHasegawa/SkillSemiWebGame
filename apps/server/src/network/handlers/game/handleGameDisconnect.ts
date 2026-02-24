/**
 * handleGameDisconnect
 * ゲーム切断ユースケースを呼び出してプレイヤー離脱を配信する
 */
import { Server } from "socket.io";
import { GameSessionManager } from "@server/domains/game/GameSessionManager";
import { disconnectUseCase } from "@server/domains/game/application/useCases/disconnectUseCase";
import { createGameDisconnectPublisher } from "./createGameEventPublisher";

/** 切断したプレイヤーをゲーム管理から除外し通知する */
export const handleGameDisconnect = (
  io: Server,
  gameManager: GameSessionManager,
  roomId: string | undefined,
  playerId: string
) => {
  const gameDisconnectPublisher = createGameDisconnectPublisher(io);

  disconnectUseCase({
    gameManager,
    playerId,
    publishPlayerRemoved: (removedPlayerId) => {
      if (!roomId) {
        return;
      }

      gameDisconnectPublisher.publishPlayerRemovedToRoom(roomId, removedPlayerId);
    },
  });
};
