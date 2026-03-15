/**
 * PlayerMoveSender
 * ローカルプレイヤー移動の送信責務を提供する
 * シミュレーション層から通信実装を分離する
 */
import { domain } from "@repo/shared";
import { socketManager } from "@client/network/SocketManager";

/** 移動送信時の動作オプション */
export type SendMoveOptions = {
  force?: boolean;
};

/** 移動送信のインターフェース型 */
export type MoveSender = {
  sendMove: (x: number, y: number, options?: SendMoveOptions) => void;
};

/** ソケット経由で移動送信を行う実装 */
export class SocketPlayerMoveSender implements MoveSender {
  private lastSentPosition: domain.game.player.MovePayload | null = null;

  /** 指定座標をサーバーへ送信する */
  public sendMove(x: number, y: number, options?: SendMoveOptions): void {
    const quantizedPosition = domain.game.player.quantizeMovePayload({ x, y });
    const lastPosition = this.lastSentPosition;

    if (
      !options?.force
      &&
      lastPosition
      && domain.game.player.isSameMovePayload(lastPosition, quantizedPosition)
    ) {
      return;
    }

    this.lastSentPosition = quantizedPosition;
    socketManager.game.sendMove(quantizedPosition.x, quantizedPosition.y);
  }
}