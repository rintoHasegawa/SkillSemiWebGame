/**
 * GameEventFacade
 * ゲーム中に受信したイベントの適用窓口を提供する
 * セッション開始同期と爆弾反映の処理を集約する
 */
import type { BombPlacedAckPayload, BombPlacedPayload } from "@repo/shared";
import type { BombManager } from "../entities/bomb/BombManager";

/** GameEventFacade の初期化入力 */
export type GameEventFacadeOptions = {
  onGameStarted: (startTime: number) => void;
  getBombManager: () => BombManager | null;
};

/** 受信イベントの適用窓口を提供する */
export class GameEventFacade {
  private readonly onGameStarted: (startTime: number) => void;
  private readonly getBombManager: () => BombManager | null;

  constructor({ onGameStarted, getBombManager }: GameEventFacadeOptions) {
    this.onGameStarted = onGameStarted;
    this.getBombManager = getBombManager;
  }

  /** 内部ゲーム開始イベントを適用する */
  public applyGameStarted(startTime: number): void {
    this.onGameStarted(startTime);
  }

  /** 内部リモート爆弾設置イベントを適用する */
  public applyRemoteBombPlaced(payload: BombPlacedPayload): void {
    this.getBombManager()?.applyPlacedBombFromOthers(payload);
  }

  /** 内部爆弾設置ACKイベントを適用する */
  public applyBombPlacementAcknowledged(payload: BombPlacedAckPayload): void {
    this.getBombManager()?.applyPlacedBombAck(payload);
  }
}