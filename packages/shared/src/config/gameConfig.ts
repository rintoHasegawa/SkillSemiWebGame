/**
 * gameConfig
 * ゲーム進行，描画，入力に関する共有設定値を定義する
 * クライアントとサーバーで参照する定数群を提供する
 */
/** ゲーム全体で利用する共有設定値 */
const NETWORK_SYNC_CONFIG = {
  PLAYER_POSITION_UPDATE_MS: 50,
  POSITION_QUANTIZE_SCALE: 100,
  HURRICANE_POSITION_QUANTIZE_SCALE: 10,
  HURRICANE_ROTATION_QUANTIZE_SCALE: 4,
} as const;

/** AOI同期で利用する1セルのグリッド幅 */
const AOI_CELL_SIZE = 3 as const;

/** フィールドサイズ種別ごとのAOIセル数と推奨人数レンジ */
const FIELD_PRESETS = {
  SMALL: {
    aoiCols: 8,
    aoiRows: 8,
    recommendedPlayers: { min: 4, max: 20 },
  },
  MEDIUM: {
    aoiCols: 12,
    aoiRows: 12,
    recommendedPlayers: { min: 20, max: 40 },
  },
  LARGE: {
    aoiCols: 15,
    aoiRows: 15,
    recommendedPlayers: { min: 40, max: 70 },
  },
  XLARGE: {
    aoiCols: 18,
    aoiRows: 18,
    recommendedPlayers: { min: 70, max: 100 },
  },
} as const;

/** 既定で利用するフィールドサイズ種別 */
const DEFAULT_FIELD_PRESET = "MEDIUM" as const;

const defaultFieldPreset = FIELD_PRESETS[DEFAULT_FIELD_PRESET];
const defaultGridCols = defaultFieldPreset.aoiCols * AOI_CELL_SIZE;
const defaultGridRows = defaultFieldPreset.aoiRows * AOI_CELL_SIZE;

/** ゲーム全体で利用する共有設定値 */
export const GAME_CONFIG = {
  // ゲーム進行設定（クライアント/サーバー契約）
  GAME_DURATION_SEC: 180, // 1ゲームの制限時間（秒）
  GAME_START_DELAY_MS: 5000, // 開始通知から実際にゲーム進行を開始するまでの待機時間（ms）

  // ネットワーク同期設定（クライアント/サーバー契約）
  NETWORK_SYNC: NETWORK_SYNC_CONFIG,
  PLAYER_POSITION_UPDATE_MS: NETWORK_SYNC_CONFIG.PLAYER_POSITION_UPDATE_MS, // 後方互換のため維持
  POSITION_QUANTIZE_SCALE: NETWORK_SYNC_CONFIG.POSITION_QUANTIZE_SCALE, // 後方互換のため維持
  HURRICANE_POSITION_QUANTIZE_SCALE: NETWORK_SYNC_CONFIG.HURRICANE_POSITION_QUANTIZE_SCALE, // 後方互換のため維持
  HURRICANE_ROTATION_QUANTIZE_SCALE: NETWORK_SYNC_CONFIG.HURRICANE_ROTATION_QUANTIZE_SCALE, // 後方互換のため維持

  // AOI設定（クライアント/サーバー契約）
  AOI_CELL_SIZE,
  FIELD_PRESETS,
  DEFAULT_FIELD_PRESET,

  // グリッド（マス）設定（クライアント/サーバー契約）
  GRID_COLS: defaultGridCols, // 横のマス数（グリッド単位）
  GRID_ROWS: defaultGridRows, // 縦のマス数（グリッド単位）

  // プレイヤー挙動設定（内部座標はグリッド単位、契約値）
  PLAYER_RADIUS: 0.5, // プレイヤー半径（グリッド単位、目安: 0.05〜0.2）
  PLAYER_SPEED: 3, // 1秒当たりの移動量（グリッド単位）
  PLAYER_RENDER_SCALE: 1, // プレイヤー見た目サイズ倍率（1=等倍）
  PLAYER_HIT_STUN_MS: 1000, // 被弾時に入力を停止する時間（ms）
  PLAYER_RESPAWN_HIT_COUNT: 5, // この回数被弾したら初期位置へリスポーンする
  PLAYER_RESPAWN_STUN_MS: 2000, // リスポーン前にスタンする時間（ms）
  PLAYER_RESPAWN_EFFECT_SCALE: 2.4, // bakuhatueffe演出の見た目サイズ倍率（1=等倍）

  // 爆弾設定（内部座標はグリッド単位、時間はms、契約値）
  BOMB_RADIUS_GRID: 1.5, // 爆風半径（グリッド単位、円形当たり判定）
  BOMB_RENDER_SCALE: 1.0, // 爆弾見た目サイズ倍率（1=等倍）
  BOMB_FUSE_MS: 1000, // 設置から爆発までの時間（ms）
  BOMB_COOLDOWN_MS: 4000, // 通常時の後方互換用クールダウン時間（ms）
  BOMB_NORMAL_COOLDOWN_MS: 4000, // 通常時に次の爆弾を置けるまでの待機時間（ms）
  BOMB_FEVER_COOLDOWN_MS: 2000, // フィーバー時に次の爆弾を置けるまでの待機時間（ms）
  BOMB_FEVER_START_REMAINING_SEC: 60, // フィーバー開始の残り時間しきい値（秒）
  BOMB_DEDUP_EXTRA_TTL_MS: 1000, // 重複排除保持時間の追加分（ms）

  // ハリケーンイベント設定（クライアント/サーバー契約）
  HURRICANE_ENABLED: true, // ハリケーンイベント有効フラグ
  HURRICANE_SPAWN_REMAINING_SEC: 120, // ハリケーン出現開始の残り時間しきい値（秒）
  HURRICANE_COUNT: 5, // 同時出現数
  HURRICANE_DIAMETER_GRID: 2.2, // 見た目と判定に共通で利用する直径（グリッド単位）
  HURRICANE_MOVE_SPEED: 1.5, // 1秒あたりの移動速度（グリッド単位）
  HURRICANE_HIT_COOLDOWN_MS: 3000, // 同一対象への連続被弾クールダウン（ms）
  HURRICANE_VISUAL_ROTATION_SPEED: 2.6, // 描画回転速度（rad/s）

  // チーム設定（クライアント/サーバー契約）
  TEAM_COUNT: 4,
} as const;

/** teamId インデックス順のチーム名配列 */
export const TEAM_NAMES = [
  "赤チーム",
  "青チーム",
  "緑チーム",
  "黄チーム",
] as const;

/** プレイヤー情報から teamId を解決できない場合に利用する既定値 */
export const UNKNOWN_TEAM_ID = -1;
