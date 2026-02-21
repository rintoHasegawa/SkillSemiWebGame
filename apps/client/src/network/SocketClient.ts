import { io, Socket } from "socket.io-client";
import { SocketEvents } from "@repo/shared/src/protocol/events";
import type { MovePayload, PlayerData } from "@repo/shared/src/types/player";
import type { CellUpdate } from "@repo/shared/src/types/map";
import type { Room, JoinRoomPayload } from "@repo/shared/src/types/room";

/**
 * サーバー WebSocket 通信管理クラス
 */
export class SocketClient {
  public socket: Socket;

  constructor() {
    // Socket.io クライアント接続初期化
    this.socket = io();
  }

  /**
   * 接続完了イベント購読
   * @param callback 接続済みソケットID受け取りコールバック
   */
  onConnect(callback: (id: string) => void) {
    // 接続済み状態での即時通知
    if (this.socket.connected) {
      callback(this.socket.id || "");
    }

    // 初回接続・再接続イベント購読
    this.socket.on(SocketEvents.CONNECT, () => {
      callback(this.socket.id || "");
    });
  }

  /**
   * 初期プレイヤー一覧受信イベント購読
   */
  onCurrentPlayers(callback: (players: PlayerData[] | Record<string, PlayerData>) => void) {
    this.socket.on(SocketEvents.CURRENT_PLAYERS, callback);
  }

  /**
   * 新規プレイヤー参加イベント購読
   */
  onNewPlayer(callback: (player: PlayerData) => void) {
    this.socket.on(SocketEvents.NEW_PLAYER, callback);
  }

  /**
   * 他プレイヤー状態更新イベント購読
   */
  onUpdatePlayer(callback: (data: Partial<PlayerData> & { id: string }) => void) {
    this.socket.on(SocketEvents.UPDATE_PLAYER, callback);
  }

  /**
   * プレイヤー退出イベント購読
   */
  onRemovePlayer(callback: (id: string) => void) {
    this.socket.on(SocketEvents.REMOVE_PLAYER, callback);
  }

  /**
   * 自身移動データ送信
   * @param x 現在のX座標
   * @param y 現在のY座標
   */
  sendMove(x: number, y: number) {
    const payload: MovePayload = { x, y };
    this.socket.emit(SocketEvents.MOVE, payload);
  }

  /**
   * マス目の差分更新イベント購読
   */
  onUpdateMapCells(callback: (updates: CellUpdate[]) => void) {
    this.socket.on(SocketEvents.UPDATE_MAP_CELLS, callback);
  }

  /**
    * ルーム入室リクエスト送信
   * @param roomId 入室先のID
   * @param playerName 表示名
   */
  joinRoom(roomId: string, playerName: string) {
    const payload: JoinRoomPayload = { roomId, playerName };
    this.socket.emit(SocketEvents.JOIN_ROOM, payload);
  }

  /**
   * ルーム情報更新イベント購読
   */
  onRoomUpdate(callback: (room: Room) => void) {
    this.socket.on(SocketEvents.ROOM_UPDATE, callback);
  }

  /**
   * ゲーム開始通知イベント購読
   */
  onGameStart(callback: () => void) {
    this.socket.on(SocketEvents.GAME_START, callback);
  }

  /**
   * ゲーム開始リクエスト送信
   */
  startGame() {
    this.socket.emit(SocketEvents.START_GAME);
  }

  /**
   * ゲーム画面準備完了通知
   */
  readyForGame() {
    this.socket.emit(SocketEvents.READY_FOR_GAME);
  }

  /**
   * 全てのゲームプレイ関連イベントを解除（一括解除用）
   */
  removeAllListeners() {
    this.socket.off(SocketEvents.CURRENT_PLAYERS);
    this.socket.off(SocketEvents.NEW_PLAYER);
    this.socket.off(SocketEvents.UPDATE_PLAYER);
    this.socket.off(SocketEvents.REMOVE_PLAYER);
    this.socket.off(SocketEvents.UPDATE_MAP_CELLS);
  }
}

// シングルトン利用向け共有インスタンス
export const socketClient = new SocketClient();