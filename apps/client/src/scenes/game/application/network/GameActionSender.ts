/**
 * GameActionSender
 * ゲーム中の送信アクションを提供する
 * マネージャー層からソケット実装を分離する
 */
import type { PlaceBombPayload } from "@repo/shared";
import { socketManager } from "@client/network/SocketManager";

/** ゲーム中送信アクションのインターフェース型 */
export type GameActionSender = {
  readyForGame: () => void;
  sendPlaceBomb: (payload: PlaceBombPayload) => void;
  sendBombHitReport: (bombId: string) => void;
};

/** ソケット経由でゲーム中送信アクションを実行する実装 */
export class SocketGameActionSender implements GameActionSender {
  /** ゲーム準備完了をサーバーへ送信する */
  public readyForGame(): void {
    socketManager.game.readyForGame();
  }

  /** 爆弾設置要求をサーバーへ送信する */
  public sendPlaceBomb(payload: PlaceBombPayload): void {
    socketManager.game.sendPlaceBomb(payload);
  }

  /** 被弾報告をサーバーへ送信する */
  public sendBombHitReport(bombId: string): void {
    socketManager.game.sendBombHitReport({ bombId });
  }
}