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
  onBombPlacedFromOthers: (payload: BombPlacedPayload) => void;
  onBombPlacedAckFromNetwork: (payload: BombPlacedAckPayload) => void;
  onPlayerDeadFromNetwork: (payload: PlayerDeadPayload) => void;
};

/** 戦闘関連イベントの橋渡しを担当する */
export class CombatSyncHandler {
  private readonly onBombPlacedFromOthers: (payload: BombPlacedPayload) => void;
  private readonly onBombPlacedAckFromNetwork: (payload: BombPlacedAckPayload) => void;
  private readonly onPlayerDeadFromNetwork: (payload: PlayerDeadPayload) => void;

  constructor({
    onBombPlacedFromOthers,
    onBombPlacedAckFromNetwork,
    onPlayerDeadFromNetwork,
  }: CombatSyncHandlerOptions) {
    this.onBombPlacedFromOthers = onBombPlacedFromOthers;
    this.onBombPlacedAckFromNetwork = onBombPlacedAckFromNetwork;
    this.onPlayerDeadFromNetwork = onPlayerDeadFromNetwork;
  }

  /** 他プレイヤーの爆弾設置イベントを橋渡しする */
  public handleBombPlaced = (payload: BombPlacedPayload): void => {
    this.onBombPlacedFromOthers(payload);
  };

  /** 設置ACKイベントを橋渡しする */
  public handleBombPlacedAck = (payload: BombPlacedAckPayload): void => {
    this.onBombPlacedAckFromNetwork(payload);
  };

  /** 被弾通知イベントを橋渡しする */
  public handlePlayerDead = (payload: PlayerDeadPayload): void => {
    this.onPlayerDeadFromNetwork(payload);
  };
}