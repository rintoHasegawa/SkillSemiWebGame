/**
 * PlayerMoveSender
 * ローカルプレイヤー移動の送信責務を提供する
 * シミュレーション層から通信実装を分離する
 */
import { config } from "@client/config";
import { socketManager } from "@client/network/SocketManager";

/** 移動送信のインターフェース型 */
export type MoveSender = {
  sendMove: (x: number, y: number) => void;
};

type QuantizedPosition = {
  x: number;
  y: number;
};

/** ソケット経由で移動送信を行う実装 */
export class SocketPlayerMoveSender implements MoveSender {
  private lastSentPosition: QuantizedPosition | null = null;

  /** 指定座標をサーバーへ送信する */
  public sendMove(x: number, y: number): void {
    const quantizedPosition = this.quantizePosition(x, y);
    const lastPosition = this.lastSentPosition;

    if (
      lastPosition
      && lastPosition.x === quantizedPosition.x
      && lastPosition.y === quantizedPosition.y
    ) {
      return;
    }

    this.lastSentPosition = quantizedPosition;
    socketManager.game.sendMove(quantizedPosition.x, quantizedPosition.y);
  }

  private quantizePosition(x: number, y: number): QuantizedPosition {
    return {
      x: this.quantizeAxis(x),
      y: this.quantizeAxis(y),
    };
  }

  private quantizeAxis(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }

    const scale = config.GAME_CONFIG.POSITION_QUANTIZE_SCALE;
    return Math.round(value * scale) / scale;
  }
}