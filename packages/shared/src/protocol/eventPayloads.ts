/**
 * eventPayloads
 * ソケットイベントで送受信するペイロード型の集約エントリ
 * 機能別に分割した型を再公開して契約参照を一本化する
 */

/** 共通イベントのペイロード型を再公開する */
export type { PingPayload, PongPayload } from "./payloads/commonPayloads";

/** ロビーイベントのペイロード型を再公開する */
export type {
  JoinRoomPayload,
  RoomJoinRejectedPayload,
  RoomUpdatePayload,
} from "./payloads/lobbyPayloads";

/** ゲームイベントのペイロード型を再公開する */
export type {
  PlayerSnapshotPayload,
  PlayerDeltaPayload,
  InitialPlayerSyncPayload,
  DeltaPlayerSyncPayload,
  UpdatePlayersPayload,
  CurrentPlayersPayload,
  UpdateMapCellsPayload,
  NewPlayerPayload,
  RemovePlayerPayload,
  GameStartPayload,
  StartGameRequestPayload,
  MovePayload,
  PlaceBombPayload,
  BombPlacedPayload,
  BombPlacedAckPayload,
  BombHitReportPayload,
  PlayerHitPayload,
  GameResultPayload,
  GameResultRanking,
  PlayerGameStats,
} from "./payloads/gamePayloads";

/** 被弾演出イベントのペイロード型を再公開する */
export type {
  LocalBombHitEffectPayload,
  NetworkPlayerHitEffectPayload,
  PlayerHitEffectEventPayloadMap,
  PlayerHitEffectEventName,
  PlayerHitEffectPayloadOf,
} from "./payloads/playerHitEffectPayloads";
