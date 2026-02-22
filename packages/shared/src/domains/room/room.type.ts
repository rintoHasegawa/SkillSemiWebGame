// クライアント画面遷移利用ゲーム状態型
export type GameState = "title" | "lobby" | "playing";

// ルーム進行フェーズ状態型
export type RoomStatus = "waiting" | "playing" | "result";

// ルーム所属プレイヤー情報型
export interface RoomMember {
  id: string;
  name: string;
  isOwner: boolean;
  isReady: boolean;
}

// ルーム全体状態データ構造型
export interface Room {
  roomId: string;
  ownerId: string;
  players: RoomMember[];
  status: RoomStatus;
  maxPlayers: number;
}

// ルーム参加時送信ペイロード型
export interface JoinRoomPayload {
  roomId: string;
  playerName: string;
}