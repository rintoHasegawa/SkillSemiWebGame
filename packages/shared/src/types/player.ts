// クライアント・サーバー間共有プレイヤー基本情報型
export interface PlayerData {
  id: string;
  x: number;
  y: number;
  teamId: number;   // 0〜3 のチームID
}

// 移動イベント送信ペイロード型
export interface MovePayload {
  x: number;
  y: number;
}