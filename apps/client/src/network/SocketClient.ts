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

  // 切断処理
  disconnect() {
    this.socket.disconnect();
  }
}

// どこからでも同じ接続を使えるようにインスタンス化してエクスポート
export const socketClient = new SocketClient();