// 移動イベント送信ペイロード型
export interface MovePayload {
  x: number;
  y: number;
}

// ルーム参加時送信ペイロード型
export interface JoinRoomPayload {
  roomId: string;
  playerName: string;
}