import { io, Socket } from "socket.io-client";
import { protocol, config } from "@repo/shared";
import type { playerTypes, gridMapTypes, roomTypes } from "@repo/shared";

/**
 * サーバー WebSocket 通信管理クラス
 */
export class SocketClient {
  public socket: Socket;

  constructor() {
    // サーバー（バックエンド）のURLを直接指定する
    // 本番環境（Render）のURLを指定することで、プロキシなしで直接通信させます
    const SERVER_URL = import.meta.env.PROD
      ? config.NETWORK_CONFIG.PROD_SERVER_URL
      : config.NETWORK_CONFIG.DEV_SERVER_URL;

    this.socket = io(SERVER_URL, {
      transports: [...config.NETWORK_CONFIG.SOCKET_TRANSPORTS], // 接続の安定性を高める
      withCredentials: true
    });
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
    this.socket.on(protocol.SocketEvents.CONNECT, () => {
      callback(this.socket.id || "");
    });
  }

  /**
   * 初期プレイヤー一覧受信イベント購読
   */
  onCurrentPlayers(callback: (players: playerTypes.PlayerData[] | Record<string, playerTypes.PlayerData>) => void) {
    this.socket.on(protocol.SocketEvents.CURRENT_PLAYERS, callback);
  }

  /**
   * 新規プレイヤー参加イベント購読
   */
  onNewPlayer(callback: (player: playerTypes.PlayerData) => void) {
    this.socket.on(protocol.SocketEvents.NEW_PLAYER, callback);
  }

  /**
   * 他プレイヤー状態更新イベント購読
   */
  onUpdatePlayer(callback: (data: Partial<playerTypes.PlayerData> & { id: string }) => void) {
    this.socket.on(protocol.SocketEvents.UPDATE_PLAYER, callback);
  }

  /**
   * プレイヤー退出イベント購読
   */
  onRemovePlayer(callback: (id: string) => void) {
    this.socket.on(protocol.SocketEvents.REMOVE_PLAYER, callback);
  }

  /**
   * 自身移動データ送信
   * @param x 現在のX座標
   * @param y 現在のY座標
   */
  sendMove(x: number, y: number) {
    const payload: playerTypes.MovePayload = { x, y };
    this.socket.emit(protocol.SocketEvents.MOVE, payload);
  }

  /**
   * マス目の差分更新イベント購読
   */
  onUpdateMapCells(callback: (updates: gridMapTypes.CellUpdate[]) => void) {
    this.socket.on(protocol.SocketEvents.UPDATE_MAP_CELLS, callback);
  }

  /**
    * ルーム入室リクエスト送信
   * @param roomId 入室先のID
   * @param playerName 表示名
   */
  joinRoom(roomId: string, playerName: string) {
    const payload: roomTypes.JoinRoomPayload = { roomId, playerName };
    this.socket.emit(protocol.SocketEvents.JOIN_ROOM, payload);
  }

  /**
   * ルーム情報更新イベント購読
   */
  onRoomUpdate(callback: (room: roomTypes.Room) => void) {
    this.socket.on(protocol.SocketEvents.ROOM_UPDATE, callback);
  }

  /**
   * ゲーム開始通知イベント購読
   */
  onGameStart(callback: (data: { startTime: number }) => void) {
    this.socket.on(protocol.SocketEvents.GAME_START, callback);
  }

  /**
   * ゲーム開始リクエスト送信
   */
  startGame() {
    this.socket.emit(protocol.SocketEvents.START_GAME);
  }

  /**
   * ゲーム画面準備完了通知
   */
  readyForGame() {
    this.socket.emit(protocol.SocketEvents.READY_FOR_GAME);
  }

  /**
   * 全てのゲームプレイ関連イベントを解除（一括解除用）
   */
  removeAllListeners() {
    this.socket.off(protocol.SocketEvents.CURRENT_PLAYERS);
    this.socket.off(protocol.SocketEvents.NEW_PLAYER);
    this.socket.off(protocol.SocketEvents.UPDATE_PLAYER);
    this.socket.off(protocol.SocketEvents.REMOVE_PLAYER);
    this.socket.off(protocol.SocketEvents.UPDATE_MAP_CELLS);
  }
}

// シングルトン利用向け共有インスタンス
export const socketClient = new SocketClient();