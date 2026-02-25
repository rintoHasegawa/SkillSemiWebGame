/**
 * gameUseCasePorts
 * ゲーム系ユースケースが利用する入力ポートと出力ポートの契約を定義する
 */
import type { BombRoomStateClearReason } from "@server/domains/game/entities/bomb/BombRoomStateStore";
import type {
  BombPlacedPayload,
  gameTypes,
  playerTypes,
  PlaceBombPayload,
  roomTypes,
  CurrentPlayersPayload,
  GameResultPayload,
  GameStartPayload,
  PongPayload,
  RemovePlayerPayload,
  UpdateMapCellsPayload,
  UpdatePlayersPayload,
} from "@repo/shared";

/** ゲーム開始ユースケースが利用するゲーム管理入力ポート */
export interface StartGamePort {
  startRoomSession(
    roomId: string,
    playerIds: string[],
    onTick: (data: gameTypes.TickData) => void,
    onGameEnd: (payload: GameResultPayload) => void
  ): void;
  getRoomStartTime(roomId: string): number | undefined;
}

/** ゲーム開始調停で利用するルーム管理入力ポート */
export interface StartGameRoomPort {
  getRoomByOwnerId(ownerId: string): roomTypes.Room | undefined;
  markRoomPlaying(roomId: string): roomTypes.Room | undefined;
  markRoomWaiting(roomId: string): roomTypes.Room | undefined;
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
  publishPongToSocket(payload: PongPayload): void;
  publishUpdatePlayersToRoom(
    roomId: roomTypes.Room["roomId"],
    players: UpdatePlayersPayload
  ): void;
  publishMapCellUpdatesToRoom(
    roomId: roomTypes.Room["roomId"],
    cellUpdates: UpdateMapCellsPayload
  ): void;
  publishGameEndToRoom(roomId: roomTypes.Room["roomId"]): void;
  publishGameResultToRoom(roomId: roomTypes.Room["roomId"], payload: GameResultPayload): void;
  publishGameStartToRoom(roomId: roomTypes.Room["roomId"], payload: GameStartPayload): void;
  publishCurrentPlayersToSocket(players: CurrentPlayersPayload): void;
  publishGameStartToSocket(payload: GameStartPayload): void;
  publishBombPlacedToRoom(roomId: roomTypes.Room["roomId"], payload: BombPlacedPayload): void;
  publishPlayerRemovedToRoom(roomId: roomTypes.Room["roomId"], removedPlayerId: RemovePlayerPayload): void;
}

/** 爆弾設置ユースケースが利用する爆弾状態入力ポート */
export interface BombPlacementPort {
  shouldBroadcastBombPlaced(roomId: string, dedupeKey: string, nowMs: number): boolean;
  issueServerBombId(roomId: string): string;
}

/** 爆弾状態破棄ユースケースが利用する入力ポート */
export interface BombCleanupPort {
  clearBombRoomState(roomId: string, reason: BombRoomStateClearReason): void;
}

/** 爆弾状態の参照更新と破棄を扱う統合入力ポート */
export interface BombStatePort extends BombPlacementPort, BombCleanupPort {}

/** 爆弾設置ユースケースの入力値 */
export type PlaceBombInput = {
  socketId: string;
  payload: PlaceBombPayload;
  nowMs: number;
};
