// プレイヤーの基本情報を定義する共通型
export interface PlayerData {
  id: string;
  x: number;
  y: number;
  teamId: number;   // 0〜3の数値を想定
}