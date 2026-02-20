export interface Player {
  id: string;        // Socket ID
  name: string;      // ユーザーが入力した名前
  isOwner: boolean;  // ルームオーナーかどうか
  isReady: boolean;  // 準備完了状態
}

export type RoomStatus = 'waiting' | 'playing' | 'result';

export interface Room {
  roomId: string;      // ルームを識別するID
  ownerId: string;     // オーナーのPlayer ID
  players: Player[];   // 参加中のプレイヤーリスト
  status: RoomStatus;  // 現在の状態
  maxPlayers: number;  // 最大参加人数（デフォルト4など）
}

// サーバーからクライアントへ送るイベントの型（任意ですがあると便利です）
export interface ServerToClientEvents {
  'room-update': (room: Room) => void;
  'game-start': () => void;
  'error-message': (message: string) => void;
}

// クライアントからサーバーへ送るイベントの型
export interface ClientToServerEvents {
  'join-room': (payload: { roomId: string; playerName: string }) => void;
  'leave-room': () => void;
  'start-game': () => void;
}