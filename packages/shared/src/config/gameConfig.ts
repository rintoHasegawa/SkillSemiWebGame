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

  // ネットワーク・描画設定
  PLAYER_POSITION_UPDATE_MS: 50,  // 座標送信の間隔 (20Hz = 50ms)
  PLAYER_LERP_SMOOTHNESS: 0.3,    // 他プレイヤーの動きの滑らかさ (0.1〜0.5程度で調整)
  PLAYER_LERP_SNAP_THRESHOLD: 0.5,  // これ以下の距離になったら座標を強制的に合わせる
} as const;