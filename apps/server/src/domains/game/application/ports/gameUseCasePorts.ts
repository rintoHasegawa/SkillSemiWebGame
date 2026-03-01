/**
 * gameUseCasePorts
 * ゲーム系ユースケースが利用する入力ポートと出力ポートの契約を定義する
 */
import type {
  BombHitReportPayload,
  BombPlacedAckPayload,
  BombPlacedPayload,
  PlayerDeadPayload,
  domain,
  PlaceBombPayload,
  CurrentPlayersPayload,
  GameResultPayload,
  GameStartPayload,
  PongPayload,
  RemovePlayerPayload,
  UpdatePlayersPayload,
} from "@repo/shared";
import type { GameSessionCallbacks } from "../services/GameRoomSession";

/** ゲーム開始ユースケースが利用するゲーム管理入力ポート */
export interface StartGamePort {
  startRoomSession(
    playerIds: string[],
    playerNamesById: Record<string, string>,
    callbacks: GameSessionCallbacks,
  ): void;
  getRoomStartTime(): number | undefined;
}

/** 準備完了ユースケースが利用するゲーム状態参照入力ポート */
export interface ReadyForGamePort {
  getRoomPlayers(): domain.game.player.PlayerData[];
  getRoomStartTime(): number | undefined;
}

/** 移動入力ユースケースが利用するプレイヤー操作入力ポート */
export interface MovePlayerPort {
  movePlayer(id: string, x: number, y: number): void;
}

/** 切断ユースケースが利用するプレイヤー削除入力ポート */
export interface DisconnectPlayerPort {
  removePlayer(id: string): void;
  replaceDisconnectedPlayerWithBot(id: string): boolean;
}

/** ゲーム系ユースケースが利用する送信出力ポート */
export interface GameOutputPort {
  publishPongToSocket(payload: PongPayload): void;
  publishUpdatePlayersToRoom(
    roomId: domain.room.Room["roomId"],
    players: UpdatePlayersPayload,
  ): void;
  publishMapCellUpdatesToRoom(
    roomId: domain.room.Room["roomId"],
    cellUpdates: domain.game.gridMap.CellUpdate[],
  ): void;
  publishGameEndToRoom(roomId: domain.room.Room["roomId"]): void;
  publishGameResultToRoom(
    roomId: domain.room.Room["roomId"],
    payload: GameResultPayload,
  ): void;
  publishGameStartToRoom(
    roomId: domain.room.Room["roomId"],
    payload: GameStartPayload,
  ): void;
  publishCurrentPlayersToSocket(players: CurrentPlayersPayload): void;
  publishGameStartToSocket(payload: GameStartPayload): void;
  publishPlayerRemovedToRoom(
    roomId: domain.room.Room["roomId"],
    removedPlayerId: RemovePlayerPayload,
  ): void;
}

/** 爆弾設置ユースケースが利用する送信出力ポート */
export interface BombPlacementOutputPort {
  publishBombPlacedToOthersInRoom(
    roomId: domain.room.Room["roomId"],
    ownerSocketId: string,
    payload: BombPlacedPayload,
  ): void;
  publishBombPlacedAckToSocket(
    socketId: string,
    payload: BombPlacedAckPayload,
  ): void;
}

/** プレイヤー死亡通知の送信出力ポート */
export interface PlayerDeadOutputPort {
  publishPlayerDeadToOthersInRoom(
    roomId: domain.room.Room["roomId"],
    deadPlayerId: string,
    payload: PlayerDeadPayload,
  ): void;
}

/** start-game 系フローで利用する送信出力ポート */
export type StartGameOutputPort = Pick<
  GameOutputPort,
  | "publishUpdatePlayersToRoom"
  | "publishMapCellUpdatesToRoom"
  | "publishGameEndToRoom"
  | "publishGameResultToRoom"
  | "publishGameStartToRoom"
> &
  BombPlacementOutputPort &
  PlayerDeadOutputPort;

/** 爆弾設置ユースケースが利用する爆弾状態入力ポート */
export interface BombPlacementPort {
  shouldBroadcastBombPlaced(dedupeKey: string, nowMs: number): boolean;
  issueServerBombId(): string;
  registerActiveBomb(registration: ActiveBombRegistration): void;
}

/** registerActiveBomb に渡す爆弾登録情報 */
export type ActiveBombRegistration = {
  bombId: string;
  ownerPlayerId: string;
  x: number;
  y: number;
  explodeAtElapsedMs: number;
};

/** 被弾報告ユースケースが利用する重複排除入力ポート */
export interface BombHitReportValidationPort {
  shouldBroadcastBombHitReport(dedupeKey: string, nowMs: number): boolean;
}

/** 爆弾設置ユースケースの入力値 */
export type PlaceBombInput = {
  socketId: string;
  payload: PlaceBombPayload;
  nowMs: number;
};

/** 被弾報告ユースケースの入力値 */
export type ReportBombHitInput = {
  socketId: string;
  payload: BombHitReportPayload;
  nowMs: number;
};
