import { io, Socket } from "socket.io-client";
import { SocketEvents } from "@repo/shared/src/protocol/events";
import type { PlayerData } from "@repo/shared/src/types/player";

/**
 * サーバーとのWebSocket通信を管理するクライアントクラス
 */
export class SocketClient {
  public socket: Socket;

  constructor() {
    // サーバーへの接続を開始
    this.socket = io();
  }

  /**
   * 1. 接続完了イベントの購読
   * @param callback 接続成功時に自身のソケットIDを受け取る関数
   */
  onConnect(callback: (id: string) => void) {
    this.socket.on(SocketEvents.CONNECT, () => {
      callback(this.socket.id || "");
    });
  }

  /**
   * 2. 初期プレイヤー一覧の受信
   * ゲーム参加時、既に存在する全プレイヤーのデータを受け取る
   */
  onCurrentPlayers(callback: (players: any) => void) {
    this.socket.on(SocketEvents.CURRENT_PLAYERS, callback);
  }

  /**
   * 3. 新規プレイヤー参加イベントの購読
   * 他の誰かが新しく入室したときに通知される
   */
  onNewPlayer(callback: (player: PlayerData) => void) {
    this.socket.on(SocketEvents.NEW_PLAYER, callback);
  }

  /**
   * 4. 他プレイヤーの状態更新の受信
   * 他のプレイヤーの移動などの座標データを受け取る
   */
  onUpdatePlayer(callback: (data: any) => void) {
    this.socket.on(SocketEvents.UPDATE_PLAYER, callback);
  }

  /**
   * 5. プレイヤー退出イベントの購読
   * 他のプレイヤーが切断したときに通知される
   */
  onRemovePlayer(callback: (id: string) => void) {
    this.socket.on(SocketEvents.REMOVE_PLAYER, callback);
  }

  /**
   * 6. 自身の移動データを送信
   * @param x 現在のX座標
   * @param y 現在のY座標
   */
  sendMove(x: number, y: number) {
    this.socket.emit(SocketEvents.MOVE, { x, y });
  }

  /**
   * 7. 特定のルームへの入室リクエスト
   * @param roomId 入室先のID
   * @param playerName 表示名
   */
  joinRoom(roomId: string, playerName: string) {
    this.socket.emit(SocketEvents.JOIN_ROOM, { roomId, playerName });
  }

  /**
   * 8. ルーム情報の更新を受信
   * ルーム内の人数や準備状況が変わるたびにサーバーから送られてくる
   */
  onRoomUpdate(callback: (room: any) => void) {
    this.socket.on(SocketEvents.ROOM_UPDATE, callback);
  }

  /**
   * 9. ゲーム開始通知の受信
   * サーバー側でゲーム開始が確定したときに呼ばれる
   */
  onGameStart(callback: () => void) {
    this.socket.on(SocketEvents.GAME_START, callback);
  }

  /**
   * 10. ゲーム開始リクエスト
   * ルームオーナーがゲームを開始させる際に送信する
   */
  startGame() {
    this.socket.emit(SocketEvents.START_GAME);
  }

  /**
   * 11. ゲーム画面準備完了の通知
   * シーン遷移が完了し、データを受け取る準備ができたことをサーバーに伝える
   */
  readyForGame() {
    this.socket.emit(SocketEvents.READY_FOR_GAME);
  }
}

// シングルトンインスタンスとしてエクスポート
export const socketClient = new SocketClient();