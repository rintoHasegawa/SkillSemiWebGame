// 🌟 追加: アプリの画面遷移状態を定義
export const GameState = {
  TITLE: 'title',
  LOBBY: 'lobby',
  PLAYING: 'playing',
} as const;
export type GameState = typeof GameState[keyof typeof GameState];

// 🌟 追加・修正: ルームの進行状態を文字列から定数オブジェクトに変更
export const RoomStatus = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  RESULT: 'result',
} as const;
export type RoomStatus = typeof RoomStatus[keyof typeof RoomStatus];

export interface RoomMember {
  id: string;
  name: string;
  isOwner: boolean;
  isReady: boolean;
}

export interface Room {
  roomId: string;
  ownerId: string;
  players: RoomMember[];
  status: RoomStatus;  // 👈 ここで上記の型を使用する
  maxPlayers: number;
}

export interface JoinRoomPayload {
  roomId: string;
  playerName: string;
}