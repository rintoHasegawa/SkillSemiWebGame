/**
 * gameEventPayloadMap
 * ゲーム関連イベントのペイロード対応表を定義する
 * 開始進行終了，入力，同期の契約を集約する
 */
import { SocketEvents } from "../socketEvents";
import type {
  BombPlacedAckPayload,
  BombPlacedPayload,
  CurrentPlayersPayload,
  GameResultPayload,
  GameStartPayload,
  MovePayload,
  NewPlayerPayload,
  PlaceBombPayload,
  PingPayload,
  PongPayload,
  RemovePlayerPayload,
  UpdateMapCellsPayload,
  UpdatePlayersPayload,
} from "../eventPayloads";

/** ゲーム関連のクライアント送信イベントペイロード対応表 */
export type GameClientToServerEventPayloadMap = {
  [SocketEvents.START_GAME]: undefined;
  [SocketEvents.READY_FOR_GAME]: undefined;
  [SocketEvents.MOVE]: MovePayload;
  [SocketEvents.PLACE_BOMB]: PlaceBombPayload;
  [SocketEvents.PING]: PingPayload;
};

/** ゲーム関連のサーバー送信イベントペイロード対応表 */
export type GameServerToClientEventPayloadMap = {
  [SocketEvents.GAME_START]: GameStartPayload;
  [SocketEvents.CURRENT_PLAYERS]: CurrentPlayersPayload;
  [SocketEvents.NEW_PLAYER]: NewPlayerPayload;
  [SocketEvents.UPDATE_PLAYERS]: UpdatePlayersPayload;
  [SocketEvents.REMOVE_PLAYER]: RemovePlayerPayload;
  [SocketEvents.UPDATE_MAP_CELLS]: UpdateMapCellsPayload;
  [SocketEvents.BOMB_PLACED]: BombPlacedPayload;
  [SocketEvents.BOMB_PLACED_ACK]: BombPlacedAckPayload;
  [SocketEvents.PONG]: PongPayload;
  [SocketEvents.GAME_END]: undefined;
  [SocketEvents.GAME_RESULT]: GameResultPayload;
};
