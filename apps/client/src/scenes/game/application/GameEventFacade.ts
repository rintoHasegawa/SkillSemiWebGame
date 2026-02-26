/**
 * GameEventFacade
 * ゲーム中に受信したイベントの適用窓口を提供する
 * セッション開始同期と爆弾反映の処理を集約する
 */
import type { BombPlacedAckPayload, BombPlacedPayload } from "@repo/shared";
import type { BombManager } from "../entities/bomb/BombManager";

/** GameEventFacade の初期化入力 */
export type GameEventFacadeOptions = {
  onGameStart: (startTime: number) => void;
  getBombManager: () => BombManager | null;
};

/** 受信イベントの適用窓口を提供する */
export class GameEventFacade {
  private readonly onGameStart: (startTime: number) => void;
  private readonly getBombManager: () => BombManager | null;

  constructor({ onGameStart, getBombManager }: GameEventFacadeOptions) {
    this.onGameStart = onGameStart;
    this.getBombManager = getBombManager;
  }

  /** サーバー同期のゲーム開始時刻を適用する */
  public handleGameStart(startTime: number): void {
    this.onGameStart(startTime);
  }

  /** 他プレイヤー爆弾設置を反映する */
  public handleBombPlacedFromOthers(payload: BombPlacedPayload): void {
    this.getBombManager()?.applyPlacedBombFromOthers(payload);
  }

  /** 爆弾設置ACKを反映する */
  public handleBombPlacedAck(payload: BombPlacedAckPayload): void {
    this.getBombManager()?.applyPlacedBombAck(payload);
  }
}