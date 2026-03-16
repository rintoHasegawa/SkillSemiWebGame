/**
 * gameEventPayloadMap
 * ゲーム関連イベントのペイロード対応表を定義する
 * 開始進行終了，入力，同期の契約を集約する
 */
import { SocketEvents } from "../socketEvents";
import type { PingPayload, PongPayload } from "../payloads/commonPayloads";
import type {
  BombHitReportPayload,
  BombPlacedAckPayload,
  BombPlacedPayload,
  CurrentPlayersPayload,
  CurrentHurricanesPayload,
  GameResultPayload,
  GameStartPayload,
  HurricaneHitPayload,
  StartGameRequestPayload,
  MovePayload,
  NewPlayerPayload,
  PlaceBombPayload,
  PlayerHitPayload,
  RemovePlayerPayload,
  UpdateMapCellsPayload,
  UpdateHurricanesPayload,
  UpdatePlayersPayload,
} from "../payloads/gamePayloads";

/** ゲーム関連のクライアント送信イベントペイロード対応表 */
export type GameClientToServerEventPayloadMap = {
  [SocketEvents.START_GAME]: StartGameRequestPayload;
  [SocketEvents.READY_FOR_GAME]: undefined;
  [SocketEvents.MOVE]: MovePayload;
  [SocketEvents.PLACE_BOMB]: PlaceBombPayload;
  [SocketEvents.BOMB_HIT_REPORT]: BombHitReportPayload;
  [SocketEvents.PING]: PingPayload;
};

/** ゲーム関連のサーバー送信イベントペイロード対応表 */
export type GameServerToClientEventPayloadMap = {
  [SocketEvents.GAME_START]: GameStartPayload;
  [SocketEvents.CURRENT_PLAYERS_SYNC]: CurrentPlayersPayload;
  [SocketEvents.NEW_PLAYER_SYNC]: NewPlayerPayload;
  [SocketEvents.UPDATE_PLAYERS_SYNC]: UpdatePlayersPayload;
  [SocketEvents.REMOVE_PLAYER_SYNC]: RemovePlayerPayload;
  [SocketEvents.UPDATE_MAP_CELLS_SYNC]: UpdateMapCellsPayload;
  [SocketEvents.CURRENT_HURRICANES_SYNC]: CurrentHurricanesPayload;
  [SocketEvents.UPDATE_HURRICANES_SYNC]: UpdateHurricanesPayload;
  [SocketEvents.BOMB_PLACED]: BombPlacedPayload;
  [SocketEvents.BOMB_PLACED_ACK]: BombPlacedAckPayload;
  [SocketEvents.PLAYER_HIT]: PlayerHitPayload;
  [SocketEvents.HURRICANE_HIT]: HurricaneHitPayload;
  [SocketEvents.PONG]: PongPayload;
  [SocketEvents.GAME_END]: undefined;
  [SocketEvents.GAME_RESULT]: GameResultPayload;
};
