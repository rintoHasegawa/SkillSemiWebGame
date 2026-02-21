// クライアント画面遷移利用ゲーム状態型
export const GameState = {
  TITLE: 'title',
  LOBBY: 'lobby',
  PLAYING: 'playing',
} as const;
export type GameState = typeof GameState[keyof typeof GameState];

// ルーム進行フェーズ状態型
export const RoomStatus = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  RESULT: 'result',
} as const;
export type RoomStatus = typeof RoomStatus[keyof typeof RoomStatus];

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
