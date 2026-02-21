export const GAME_CONFIG = {
  // 画面設定
  SCREEN_WIDTH: 1280,
  SCREEN_HEIGHT: 720,

  // マップ設定
  MAP_WIDTH: 2000,
  MAP_HEIGHT: 2000,

  // プレイヤー設定
  PLAYER_RADIUS: 10,      // キャラの大きさ
  PLAYER_SPEED: 5,        // 移動速度 (ピクセル/秒)
} as const;