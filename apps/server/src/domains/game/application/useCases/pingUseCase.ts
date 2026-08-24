/**
 * pingUseCase
 * PING受信時にゲーム経過時間付きPONGを返して遅延計測と時計同期を支援する
 * 受信時刻と送信時刻を別々に載せ，サーバー処理時間を除いたRTTを求められるようにする
 */
import type { PingPayload } from "@repo/shared";
import { logEvent } from "@server/logging/logger";
import {
  gameUseCaseLogEvents,
  logResults,
  logScopes,
} from "@server/logging/index";
import type {
  GameElapsedTimePort,
  GameOutputPort,
} from "../ports/gameUseCasePorts";

type PingUseCaseParams = {
  socketId: string;
  clientTime: PingPayload;
  gameClock: GameElapsedTimePort;
  output: Pick<GameOutputPort, "publishPongToSocket">;
};

/** クライアント時刻を受け取りゲーム経過時間付きで応答する */
export const pingUseCase = ({
  socketId,
  clientTime,
  gameClock,
  output,
}: PingUseCaseParams) => {
  // セッション未開始ではゲーム時間軸が無く同期基準を作れないため応答しない
  const serverReceivedElapsedMs = gameClock.getRoomSignedElapsedMs();
  if (serverReceivedElapsedMs === undefined) {
    logEvent(logScopes.GAME_USE_CASE, {
      event: gameUseCaseLogEvents.PING,
      result: logResults.IGNORED_SESSION_NOT_STARTED,
      socketId,
    });
    return;
  }

  // 送信直前に再取得し，受信からの滞留時間をクライアント側でRTTから除外できるようにする
  // 受信直後にセッションが消えた場合のみ undefined になるため，受信時刻へ倒して応答は返す
  const serverSentElapsedMs =
    gameClock.getRoomSignedElapsedMs() ?? serverReceivedElapsedMs;

  output.publishPongToSocket({
    clientTime,
    serverReceivedElapsedMs,
    serverSentElapsedMs,
  });
};
