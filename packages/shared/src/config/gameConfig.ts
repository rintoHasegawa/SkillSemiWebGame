export const GAME_CONFIG = {
  // ゲーム設定
  MAX_PLAYERS_PER_ROOM: 4,  // ルーム収容人数設定
  GAME_DURATION_SEC: 180, // 1ゲームの制限時間（3分 = 180秒）

  // ネットワーク・描画補間設定
  PLAYER_POSITION_UPDATE_MS: 50,  // 座標送信間隔（20Hz）
  PLAYER_LERP_SMOOTHNESS: 0.3,    // 補間の滑らかさ
  PLAYER_LERP_SNAP_THRESHOLD: 0.5,  // 吸着距離閾値

  // 画面サイズ設定
  SCREEN_WIDTH: 1280,
  SCREEN_HEIGHT: 720,

  // グリッド（マス）設定を新設
  GRID_CELL_SIZE: 100, // 1マスのサイズ（px）
  GRID_COLS: 20,       // 横のマス数
  GRID_ROWS: 20,       // 縦のマス数
  
  // マップサイズはグリッド設定から自動計算させる（ハードコーディングを避ける）
  get MAP_WIDTH() { return this.GRID_COLS * this.GRID_CELL_SIZE; },
  get MAP_HEIGHT() { return this.GRID_ROWS * this.GRID_CELL_SIZE; },

  // プレイヤー挙動設定
  PLAYER_RADIUS: 10,      // プレイヤー半径
  PLAYER_SPEED: 5,        // 移動速度（ピクセル/秒）

  // チームカラー設定
  // teamId インデックス順カラー配列
  TEAM_COLORS: ['#FF4B4B', '#4B4BFF', '#4BFF4B', '#FFD700'],

  // プレイヤー描画・枠線設定 (新設)
  PLAYER_LOCAL_STROKE_COLOR: 0xffff00,   // 自プレイヤーの枠線色（黄色）
  PLAYER_LOCAL_STROKE_WIDTH: 3,          // 自プレイヤーの枠線の太さ
  PLAYER_REMOTE_STROKE_COLOR: 0xffffff,  // 他プレイヤーの枠線色（白など目立たない色）
  PLAYER_REMOTE_STROKE_WIDTH: 1,         // 他プレイヤーの枠線の太さ（細め）

  // マップ描画用のカラー設定
  MAP_BG_COLOR: 0x111111,     // 何も塗っていないマス（背景）の色
  MAP_GRID_COLOR: 0x333333,   // グリッド線の色
  MAP_BORDER_COLOR: 0xff4444, // プレイ領域外枠の色
} as const;

export const NETWORK_CONFIG = {
  DEV_SERVER_URL: "http://localhost:3000",
  PROD_SERVER_URL: "https://skillsemiwebgame.onrender.com",
} as const;