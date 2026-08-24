/**
 * roomEventGuards
 * ルーム宛イベントが自分の所属ルーム向けかを判定する純関数群
 * 他ルームのROOM_UPDATE・GAME_STARTでUIが引きずられるのを防ぐ
 */
import type { domain, GameStartPayload } from "@repo/shared";

/** ルーム宛イベントの受理判定に用いる自分の所属状態 */
export type RoomMembership = {
  /** 参加中ルームID（未入室・JOIN応答待ちは null） */
  currentRoomId: string | null;
  /** 自分のソケットID（未接続は null） */
  myId: string | null;
};

/** ROOM_UPDATE受理判定の引数 */
export type ShouldAcceptRoomUpdateParams = {
  membership: RoomMembership;
  updatedRoom: domain.room.Room;
};

/** GAME_START受理判定の引数 */
export type ShouldAcceptGameStartParams = {
  membership: RoomMembership;
  payload: GameStartPayload;
};

/**
 * 受信したROOM_UPDATEを自分の所属ルーム更新として受理してよいか判定する
 * 未入室時は初回ROOM_UPDATEで所属が確定するため，名簿に自分が居ることだけを条件とする
 */
export const shouldAcceptRoomUpdate = ({
  membership,
  updatedRoom,
}: ShouldAcceptRoomUpdateParams): boolean => {
  if (membership.myId === null) {
    return false;
  }

  const isMemberOfRoom = updatedRoom.players.some(
    (player) => player.id === membership.myId,
  );
  if (!isMemberOfRoom) {
    return false;
  }

  // JOIN成功直後の初回ROOM_UPDATEはここで所属ルームが確定するため受理する
  if (membership.currentRoomId === null) {
    return true;
  }

  return membership.currentRoomId === updatedRoom.roomId;
};

/** 受信したGAME_STARTを自分の所属ルームの開始通知として受理してよいか判定する */
export const shouldAcceptGameStart = ({
  membership,
  payload,
}: ShouldAcceptGameStartParams): boolean => {
  if (membership.myId === null) {
    return false;
  }

  // 未入室でゲーム開始通知を受け取ることはないため弾く
  if (membership.currentRoomId === null) {
    return false;
  }

  return payload.roomId === membership.currentRoomId;
};
