/**
 * PlayerMoveSender
 * ローカルプレイヤー移動の送信責務を提供する
 * シミュレーション層から通信実装を分離する
 */
import { socketManager } from "@client/network/SocketManager";

/** 移動送信のインターフェース型 */
export type MoveSender = {
  sendMove: (x: number, y: number) => void;
};

/** ソケット経由で移動送信を行う実装 */
export class SocketPlayerMoveSender implements MoveSender {
  /** 指定座標をサーバーへ送信する */
  public sendMove(x: number, y: number): void {
    socketManager.game.sendMove(x, y);
  }
}