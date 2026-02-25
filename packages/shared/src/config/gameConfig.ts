/**
 * gameConfig
 * ゲーム進行，描画，入力に関する共有設定値を定義する
 * クライアントとサーバーで参照する定数群を提供する
 */
/** ゲーム全体で利用する共有設定値 */
export const GAME_CONFIG = {
  // ゲーム設定
  MAX_PLAYERS_PER_ROOM: 100,  // ルーム収容人数設定
  GAME_DURATION_SEC: 180, // 1ゲームの制限時間（3分 = 180秒）

  // UI表示更新設定
  TIMER_DISPLAY_UPDATE_MS: 250, // 残り時間表示の更新間隔（ms）
  JOIN_REQUEST_TIMEOUT_MS: 8000, // ルーム参加要求の待機タイムアウト（ms）

  // ネットワーク・描画補間設定
  PLAYER_POSITION_UPDATE_MS: 50,  // 座標送信間隔（20Hz）
  PLAYER_LERP_SMOOTHNESS: 18,     // 補間の滑らかさ（秒基準、目安: 12〜20）
  // 値を大きくすると追従が速くなるが、震えや跳ねが出やすい
  // 値を小さくすると遅延感が増えるが、動きは滑らかになる
  PLAYER_LERP_SNAP_THRESHOLD: 0.005,  // 吸着距離閾値（グリッド単位、目安: 0.003〜0.02）
  // 値を大きくすると目標に早く吸着し、停止時のブレが減るが急停止になりやすい
  // 値を小さくすると吸着が遅くなり、停止時にゆらぎが残りやすい

  // 画面サイズ設定
  SCREEN_WIDTH: 1280,
  SCREEN_HEIGHT: 720,

  // グリッド（マス）設定
  GRID_CELL_SIZE: 100, // 1マスのサイズ（px）
  GRID_COLS: 20,       // 横のマス数（グリッド単位）
  GRID_ROWS: 20,       // 縦のマス数（グリッド単位）
  
  // マップサイズはグリッド設定から自動計算させる（ハードコーディングを避ける）
  get MAP_WIDTH_PX() { return this.GRID_COLS * this.GRID_CELL_SIZE; },
  get MAP_HEIGHT_PX() { return this.GRID_ROWS * this.GRID_CELL_SIZE; },

  // プレイヤー挙動設定（内部座標はグリッド単位）
  PLAYER_RADIUS: 0.1,     // プレイヤー半径（グリッド単位、目安: 0.05〜0.2）
  get PLAYER_RADIUS_PX() { return this.PLAYER_RADIUS * this.GRID_CELL_SIZE; },
  PLAYER_SPEED: 3,        // 1秒当たりの移動量（グリッド単位）

  // 爆弾設定（内部座標はグリッド単位、時間はms）
  BOMB_RADIUS_GRID: 1.5,   // 爆風半径（グリッド単位、円形当たり判定）
  BOMB_FUSE_MS: 1000,      // 設置から爆発までの時間（ms）
  BOMB_COOLDOWN_MS: 1200,  // 設置後に次の爆弾を置けるまでの待機時間（ms）

  // チームカラー設定
  TEAM_COUNT: 4,
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