/**
 * CombatSyncHandler
 * 戦闘関連イベントの受信処理を担当する
 * 爆弾設置と被弾通知を上位へ橋渡しする
 */
import type {
  BombPlacedAckPayload,
  BombPlacedPayload,
  HurricaneHitPayload,
  PlayerHitPayload,
} from "@repo/shared";

/** CombatSyncHandler の初期化入力 */
export type CombatSyncHandlerOptions = {
  onRemoteBombPlaced: (payload: BombPlacedPayload) => void;
  onBombPlacementAcknowledged: (payload: BombPlacedAckPayload) => void;
  onRemotePlayerHit: (payload: PlayerHitPayload) => void;
  onRemoteHurricaneHit: (payload: HurricaneHitPayload) => void;
};

/** 戦闘関連イベントの橋渡しを担当する */
export class CombatSyncHandler {
  private readonly onRemoteBombPlaced: (payload: BombPlacedPayload) => void;
  private readonly onBombPlacementAcknowledged: (
    payload: BombPlacedAckPayload,
  ) => void;
  private readonly onRemotePlayerHit: (payload: PlayerHitPayload) => void;
  private readonly onRemoteHurricaneHit: (payload: HurricaneHitPayload) => void;

  constructor({
    onRemoteBombPlaced,
    onBombPlacementAcknowledged,
    onRemotePlayerHit,
    onRemoteHurricaneHit,
  }: CombatSyncHandlerOptions) {
    this.onRemoteBombPlaced = onRemoteBombPlaced;
    this.onBombPlacementAcknowledged = onBombPlacementAcknowledged;
    this.onRemotePlayerHit = onRemotePlayerHit;
    this.onRemoteHurricaneHit = onRemoteHurricaneHit;
  }

  /** 他プレイヤーの爆弾設置受信イベントを橋渡しする */
  public handleReceivedBombPlaced = (payload: BombPlacedPayload): void => {
    this.onRemoteBombPlaced(payload);
  };

  /** 爆弾設置ACK受信イベントを橋渡しする */
  public handleReceivedBombPlacedAck = (
    payload: BombPlacedAckPayload,
  ): void => {
    this.onBombPlacementAcknowledged(payload);
  };

  /** プレイヤー被弾受信イベントを橋渡しする */
  public handleReceivedPlayerHit = (payload: PlayerHitPayload): void => {
    this.onRemotePlayerHit(payload);
  };

  /** ハリケーン被弾受信イベントを橋渡しする */
  public handleReceivedHurricaneHit = (payload: HurricaneHitPayload): void => {
    this.onRemoteHurricaneHit(payload);
  };
}
