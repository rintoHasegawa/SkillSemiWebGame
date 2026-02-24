/**
 * handleGameDisconnect
 * ゲーム切断ユースケースを呼び出してプレイヤー離脱を配信する
 */
import { Server } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { disconnectUseCase } from "@server/domains/game/application/useCases/disconnectUseCase";
import { createGameDisconnectPublisher } from "./createGameEventPublisher";

/** 切断したプレイヤーをゲーム管理から除外し通知する */
export const handleGameDisconnect = (
  io: Server,
  gameManager: GameManager,
  roomId: string | undefined,
  playerId: string
) => {
  const gameDisconnectPublisher = createGameDisconnectPublisher(io);

  disconnectUseCase({
    gameManager,
    roomId,
    playerId,
    output: gameDisconnectPublisher,
  });
};
