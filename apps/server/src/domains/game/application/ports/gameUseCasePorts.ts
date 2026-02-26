/**
 * gameUseCasePorts
 * ゲーム系ユースケースが利用する入力ポートと出力ポートの契約を定義する
 */
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
  publishUpdatePlayersToSocket(
    socketId: string,
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
  publishPlayerRemovedToRoom(roomId: roomTypes.Room["roomId"], removedPlayerId: RemovePlayerPayload): void;
}

/** 爆弾ユースケースが利用する送信出力ポート */
export interface BombOutputPort {
  publishBombPlacedToRoom(roomId: roomTypes.Room["roomId"], payload: BombPlacedPayload): void;
}

/** 爆弾設置ユースケースが利用する爆弾状態入力ポート */
export interface BombPlacementPort {
  shouldBroadcastBombPlaced(roomId: string, dedupeKey: string, nowMs: number): boolean;
  issueServerBombId(roomId: string): string;
}

/** 爆弾設置ユースケースの入力値 */
export type PlaceBombInput = {
  socketId: string;
  payload: PlaceBombPayload;
  nowMs: number;
};
