/**
 * resumeSessionCoordinator
 * RESUME_SESSIONイベントの調停を行い，切断前の席への復帰処理を順序実行する
 * 予約解決・Bot制御解除・ルーム復席・配信チャンネル再参加を一貫して扱う
 */
import { domain } from "@repo/shared";
import { logEvent } from "@server/logging/logger";
import { logResults, logScopes, roomUseCaseLogEvents } from "@server/logging/index";
import type { ResumeSessionCoordinatorDeps } from "./coordinatorDeps";

/** 復帰調停の実行結果 */
export type ResumeSessionResult =
  | { status: "resumed"; playerId: string; room: domain.room.Room }
  | { status: "expired" }
  | { status: "game_ended" };

// 予約を引けなかった場合の拒否結果を組み立てる（復帰先が不明なためIDは残せない）
const rejectAsExpired = (socketId: string): ResumeSessionResult => {
  logEvent(logScopes.ROOM_USE_CASE, {
    event: roomUseCaseLogEvents.RESUME_SESSION,
    result: logResults.REJECTED_SESSION_EXPIRED,
    socketId,
  });

  return { status: "expired" };
};

// 予約は引けたが戻す席が無い場合の拒否結果を組み立てる
const rejectAsGameEnded = (params: {
  socketId: string;
  roomId: string;
  playerId: string;
}): ResumeSessionResult => {
  logEvent(logScopes.ROOM_USE_CASE, {
    event: roomUseCaseLogEvents.RESUME_SESSION,
    result: logResults.REJECTED_GAME_ENDED,
    socketId: params.socketId,
    roomId: params.roomId,
    playerId: params.playerId,
  });

  return { status: "game_ended" };
};

type ResumeSessionCoordinatorParams = {
  socketId: string;
  /** ハンドシェイクで受け取ったセッショントークン（未提示は undefined） */
  sessionToken?: string;
} & ResumeSessionCoordinatorDeps & {
  /** ルーム配信チャンネルへ再参加させる処理 */
  joinRoomChannel: (roomId: string) => Promise<void>;
};

/**
 * RESUME_SESSION受信時に予約を解決し，元の席へプレイヤーを戻す
 * 途中で解決できない場合は予約を破棄し，復帰要求を拒否する
 */
export const resumeSessionCoordinator = async ({
  socketId,
  sessionToken,
  roomManager,
  runtimeRegistry,
  sessionReservations,
  identityRegistry,
  joinRoomChannel,
}: ResumeSessionCoordinatorParams): Promise<ResumeSessionResult> => {
  if (!sessionToken) {
    return rejectAsExpired(socketId);
  }

  // 予約は1回限り有効とし，解決に失敗した場合もそのまま破棄する
  const reservation = sessionReservations.consume(sessionToken);
  if (!reservation) {
    return rejectAsExpired(socketId);
  }

  const rejectionContext = {
    socketId,
    roomId: reservation.roomId,
    playerId: reservation.playerId,
  };

  const gameManager = runtimeRegistry.getGameManagerByRoomId(reservation.roomId);
  if (!gameManager) {
    return rejectAsGameEnded(rejectionContext);
  }

  // セッションから既に外れているプレイヤーは戻す席が無いため復帰させない
  const demoted = gameManager.demotePlayerFromBotControl(reservation.playerId);
  if (!demoted) {
    return rejectAsGameEnded(rejectionContext);
  }

  const restoreResult = roomManager.restorePlayerToRoom({
    roomId: reservation.roomId,
    playerId: reservation.playerId,
    playerName: reservation.playerName,
    teamId: reservation.teamId,
  });
  if (restoreResult.status === "not_found") {
    // 復席できない場合は直前のBot制御解除を巻き戻す
    // （戻さないと人間にもBotにも操作されないプレイヤーがセッションに残る）
    gameManager.replaceDisconnectedPlayerWithBot(reservation.playerId);

    return rejectAsGameEnded(rejectionContext);
  }

  // 以降の配信を新しいソケットで受け取れるようにチャンネルと識別子を張り替える
  await joinRoomChannel(reservation.roomId);
  identityRegistry.bind(socketId, reservation.playerId);

  logEvent(logScopes.ROOM_USE_CASE, {
    event: roomUseCaseLogEvents.RESUME_SESSION,
    result: logResults.RESUMED,
    socketId,
    roomId: reservation.roomId,
    playerId: reservation.playerId,
  });

  return {
    status: "resumed",
    playerId: reservation.playerId,
    room: restoreResult.room,
  };
};
