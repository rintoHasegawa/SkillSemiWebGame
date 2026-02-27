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
  UpdateMapCellsPayload,
  UpdatePlayersPayload,
} from "@repo/shared";

/** ゲーム開始ユースケースが利用するゲーム管理入力ポート */
export interface StartGamePort {
  startRoomSession(
    playerIds: string[],
    playerNamesById: Record<string, string>,
    onTick: (data: domain.game.TickData) => void,
    onGameEnd: (payload: GameResultPayload) => void,
    onBotPlaceBomb?: (ownerId: string, payload: PlaceBombPayload) => void,
  ): void;
  getRoomStartTime(): number | undefined;
}

/** 準備完了ユースケースが利用するゲーム状態参照入力ポート */
export interface ReadyForGamePort {
  getRoomPlayers(): domain.player.PlayerData[];
  getRoomStartTime(): number | undefined;
  resolvePlayerIdFromSocketId(socketId: string): string | undefined;
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

/** セッション内 playerId 管理と外部ID変換を提供する入力ポート */
export interface SessionPlayerIdentityPort {
  resetPlayerIdentitySession(): void;
  issuePlayerIdForSocket(socketId: string): string;
  registerBotPlayerId(playerId: string): void;
}

/** ゲーム系ユースケースが利用する送信出力ポート */
export interface GameOutputPort {
  publishPongToSocket(payload: PongPayload): void;
  publishUpdatePlayersToSocket(
    socketId: string,
    players: UpdatePlayersPayload,
  ): void;
  publishMapCellUpdatesToRoom(
    roomId: domain.room.Room["roomId"],
    cellUpdates: UpdateMapCellsPayload,
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
  publishGameStartToSocketById(socketId: string, payload: GameStartPayload): void;
  publishPlayerRemovedToRoom(
    roomId: domain.room.Room["roomId"],
    removedPlayerId: RemovePlayerPayload,
  ): void;
}

/** 爆弾ユースケースが利用する送信出力ポート */
export interface BombOutputPort {
  publishBombPlacedToOthersInRoom(
    roomId: domain.room.Room["roomId"],
    excludedSocketId: string,
    payload: BombPlacedPayload,
  ): void;
  publishBombPlacedAckToSocket(
    socketId: string,
    payload: BombPlacedAckPayload,
  ): void;
  publishPlayerDeadToOthersInRoom(
    roomId: domain.room.Room["roomId"],
    excludedSocketId: string,
    payload: PlayerDeadPayload,
  ): void;
}

/** 爆弾設置ユースケースが利用する出力ポート */
export type PlaceBombOutputPort = Pick<
  BombOutputPort,
  "publishBombPlacedToOthersInRoom" | "publishBombPlacedAckToSocket"
>;

/** start-game 系フローで利用する送信出力ポート */
export type StartGameOutputPort = Pick<
  GameOutputPort,
  | "publishUpdatePlayersToSocket"
  | "publishMapCellUpdatesToRoom"
  | "publishGameEndToRoom"
  | "publishGameResultToRoom"
  | "publishGameStartToRoom"
  | "publishGameStartToSocketById"
> &
  Pick<
    BombOutputPort,
    "publishBombPlacedToOthersInRoom" | "publishBombPlacedAckToSocket"
  >;

/** 爆弾設置ユースケースが利用する爆弾状態入力ポート */
export interface BombPlacementPort {
  shouldBroadcastBombPlaced(dedupeKey: string, nowMs: number): boolean;
  issueServerBombId(): string;
}

/** 被弾報告ユースケースが利用する重複排除入力ポート */
export interface BombHitReportValidationPort {
  shouldBroadcastBombHitReport(dedupeKey: string, nowMs: number): boolean;
}

/** 被弾報告ユースケースが利用するBot被弾反映入力ポート */
export interface BotHitReactionPort {
  applyBotHitStun(playerId: string, nowMs: number): boolean;
}

/** 爆弾設置ユースケースの入力値 */
export type PlaceBombInput = {
  requesterSocketId: string;
  ownerPlayerId: string;
  payload: PlaceBombPayload;
  nowMs: number;
};

/** 被弾報告ユースケースの入力値 */
export type ReportBombHitInput = {
  socketId: string;
  payload: BombHitReportPayload;
  nowMs: number;
};

/** 被弾報告ユースケースが利用する出力ポート */
export type BombHitOutputPort = Pick<
  BombOutputPort,
  "publishPlayerDeadToOthersInRoom"
>;
