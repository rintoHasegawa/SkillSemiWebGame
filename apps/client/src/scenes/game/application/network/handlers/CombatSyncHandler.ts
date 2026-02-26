/**
 * CombatSyncHandler
 * 戦闘関連イベントの受信処理を担当する
 * 爆弾設置と被弾通知を上位へ橋渡しする
 */
import type {
  BombPlacedAckPayload,
  BombPlacedPayload,
  PlayerDeadPayload,
} from "@repo/shared";

/** CombatSyncHandler の初期化入力 */
export type CombatSyncHandlerOptions = {
  onRemoteBombPlaced: (payload: BombPlacedPayload) => void;
  onBombPlacementAcknowledged: (payload: BombPlacedAckPayload) => void;
  onRemotePlayerDead: (payload: PlayerDeadPayload) => void;
};

/** 戦闘関連イベントの橋渡しを担当する */
export class CombatSyncHandler {
  private readonly onRemoteBombPlaced: (payload: BombPlacedPayload) => void;
  private readonly onBombPlacementAcknowledged: (payload: BombPlacedAckPayload) => void;
  private readonly onRemotePlayerDead: (payload: PlayerDeadPayload) => void;

  constructor({
    onRemoteBombPlaced,
    onBombPlacementAcknowledged,
    onRemotePlayerDead,
  }: CombatSyncHandlerOptions) {
    this.onRemoteBombPlaced = onRemoteBombPlaced;
    this.onBombPlacementAcknowledged = onBombPlacementAcknowledged;
    this.onRemotePlayerDead = onRemotePlayerDead;
  }

  /** 他プレイヤーの爆弾設置受信イベントを橋渡しする */
  public handleReceivedBombPlaced = (payload: BombPlacedPayload): void => {
    this.onRemoteBombPlaced(payload);
  };

  /** 爆弾設置ACK受信イベントを橋渡しする */
  public handleReceivedBombPlacedAck = (payload: BombPlacedAckPayload): void => {
    this.onBombPlacementAcknowledged(payload);
  };

  /** プレイヤー死亡受信イベントを橋渡しする */
  public handleReceivedPlayerDead = (payload: PlayerDeadPayload): void => {
    this.onRemotePlayerDead(payload);
  };
}