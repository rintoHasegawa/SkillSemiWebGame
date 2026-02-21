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

export interface JoinRoomPayload {
  roomId: string;
  playerName: string;
}
