/**
 * SessionReservationRegistry
 * 一時的な切断からの復帰に備えて席（プレイヤーの在籍情報）を予約するレジストリ
 * 予約の寿命はゲームセッションの寿命と一致させ，猶予タイマーは持たない
 */
import type { SessionReservation } from "@server/application/coordinators/coordinatorDeps";

/** 復帰時に復元するプレイヤーの在籍情報 */
export type SessionReservationEntry = SessionReservation;

/** セッショントークン単位で復帰用の予約を保持するレジストリ */
export class SessionReservationRegistry {
  private reservationByToken: Map<string, SessionReservationEntry> = new Map();

  /** トークンに紐づく復帰予約を登録する */
  public reserve(token: string, entry: SessionReservationEntry): void {
    this.reservationByToken.set(token, entry);
  }

  /** トークンに紐づく予約を取り出して削除する（1回限り有効） */
  public consume(token: string): SessionReservationEntry | undefined {
    const entry = this.reservationByToken.get(token);
    if (!entry) {
      return undefined;
    }

    this.reservationByToken.delete(token);
    return entry;
  }

  /** 指定ルームの予約をすべて破棄する（試合終了時に呼ぶ） */
  public releaseByRoomId(roomId: string): void {
    this.reservationByToken.forEach((entry, token) => {
      if (entry.roomId !== roomId) {
        return;
      }

      this.reservationByToken.delete(token);
    });
  }

  /** 指定トークンの予約を破棄する（明示退室時に呼ぶ） */
  public releaseByToken(token: string): void {
    this.reservationByToken.delete(token);
  }
}
