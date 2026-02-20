import { io, Socket } from "socket.io-client";

// app.tsx で定義されている型と同じものをこちらでも定義しておきます
export type PlayerData = {
  id: string;
  x: number;
  y: number;
  color: string;
};

export class SocketClient {
  public socket: Socket;

  constructor() {
    // app.tsx に合わせて引数なしの io() で接続します
    this.socket = io();
  }

  // 1. 接続完了
  onConnect(callback: (id: string) => void) {
    this.socket.on("connect", () => {
      callback(this.socket.id || "");
    });
  }

  // 2. 初期プレイヤー一覧の受信
  onCurrentPlayers(callback: (players: any) => void) {
    this.socket.on("current_players", callback);
  }

  // 3. 新規プレイヤーの参加
  onNewPlayer(callback: (player: PlayerData) => void) {
    this.socket.on("new_player", callback);
  }

  // 4. 他プレイヤーの移動・更新
  onUpdatePlayer(callback: (data: any) => void) {
    this.socket.on("update_player", callback);
  }

  // 5. プレイヤーの退出
  onRemovePlayer(callback: (id: string) => void) {
    this.socket.on("remove_player", callback);
  }

  // 6. 自分の移動を送信
  sendMove(x: number, y: number) {
    this.socket.emit("move", { x, y });
  }

  // 👇==== ここからロビー・ルーム用の機能を追加 ====👇

  // 7. ルーム入室
  joinRoom(roomId: string, playerName: string) {
    this.socket.emit("join-room", { roomId, playerName });
  }

  // 8. ルーム情報が更新されたとき
  onRoomUpdate(callback: (room: any) => void) {
    this.socket.on("room-update", callback);
  }

  // 9. ゲーム開始の合図を受け取ったとき
  onGameStart(callback: () => void) {
    this.socket.on("game-start", callback);
  }

  // 10. ゲーム開始をサーバーにリクエストする
  startGame() {
    this.socket.emit("start-game");
  }
}

export const socketClient = new SocketClient();