/**
 * disconnectSessionReservation
 * 切断時に復帰予約へ残す在籍情報の採取を担う
 * 退室処理を実行すると名簿から引けなくなるため，調停の前に採取する
 */
import type { SessionReservationEntry } from "@server/network/identity";
import type {
  FindGameByPlayerPort,
  FindRoomByPlayerPort,
} from "@server/domains/room/application/ports/roomUseCasePorts";

/** 復帰予約の採取で利用する参照ポート集合 */
export type SessionReservationSourceDeps = {
  roomManager: FindRoomByPlayerPort;
  runtimeRegistry: FindGameByPlayerPort;
};

/**
 * 切断前のプレイヤー在籍情報を採取する
 * ルーム名簿から引けない場合は復帰対象にならないため undefined を返す
 */
export const collectSessionReservationEntry = (
  deps: SessionReservationSourceDeps,
  playerId: string,
): SessionReservationEntry | undefined => {
  const room = deps.roomManager.getRoomByPlayerId(playerId);
  if (!room) {
    return undefined;
  }

  const member = room.players.find((player) => player.id === playerId);
  if (!member) {
    return undefined;
  }

  // チームIDはゲームセッション側が正であり，ロビーの希望値では代替しない
  const gameManager = deps.runtimeRegistry.getGameManagerByPlayerId(playerId);
  if (!gameManager) {
    return undefined;
  }

  return {
    playerId,
    roomId: room.roomId,
    playerName: member.name,
    teamId: gameManager.getPlayerTeamId(playerId),
  };
};
