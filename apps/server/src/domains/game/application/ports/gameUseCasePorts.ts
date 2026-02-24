/**
 * gameUseCasePorts
 * ゲーム系ユースケースが利用する入力ポートと出力ポートの契約を定義する
 */
import type { TickData } from "../../loop/GameLoop";
import type { gridMapTypes, playerTypes, roomTypes } from "@repo/shared";

/** ゲーム開始ユースケースが利用するゲーム管理入力ポート */
export interface StartGamePort {
  startRoomSession(
    roomId: string,
    playerIds: string[],
    onTick: (data: TickData) => void,
    onGameEnd: () => void
  ): void;
  getRoomStartTime(roomId: string): number | undefined;
}

/** ゲーム開始調停で利用するルーム管理入力ポート */
export interface StartGameRoomPort {
  getRoomByOwnerId(ownerId: string): roomTypes.Room | undefined;
  markRoomPlaying(roomId: string): roomTypes.Room | undefined;
  markRoomWaiting(roomId: string): roomTypes.Room | undefined;
}

/** 準備完了調停で利用するルーム解決入力ポート */
export interface ReadyForGameRoomPort {
  getRoomByPlayerId(playerId: string): roomTypes.Room | undefined;
}

/** 準備完了ユースケースが利用するゲーム状態参照入力ポート */
export interface ReadyForGamePort {
  getRoomPlayers(roomId: string): playerTypes.PlayerData[];
  getRoomStartTime(roomId: string): number | undefined;
}

/** 移動入力ユースケースが利用するプレイヤー操作入力ポート */
export interface MovePlayerPort {
  movePlayer(id: string, x: number, y: number): void;
}

/** 切断ユースケースが利用するプレイヤー削除入力ポート */
export interface DisconnectPlayerPort {
  removePlayer(id: string): void;
}

/** ゲーム系ユースケースが利用する送信出力ポート */
export interface GameOutputPort {
  publishPongToSocket(payload: { clientTime: number; serverTime: number }): void;
  publishUpdatePlayerToRoom(roomId: roomTypes.Room["roomId"], playerData: playerTypes.PlayerData): void;
  publishMapCellUpdatesToRoom(
    roomId: roomTypes.Room["roomId"],
    cellUpdates: gridMapTypes.CellUpdate[]
  ): void;
  publishGameEndToRoom(roomId: roomTypes.Room["roomId"]): void;
  publishGameStartToRoom(roomId: roomTypes.Room["roomId"], payload: { startTime: number }): void;
  publishCurrentPlayersToSocket(players: playerTypes.PlayerData[]): void;
  publishGameStartToSocket(payload: { startTime: number }): void;
  publishPlayerRemovedToRoom(roomId: roomTypes.Room["roomId"], removedPlayerId: string): void;
}
