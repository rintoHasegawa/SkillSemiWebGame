/**
 * gameConfig
 * ゲーム進行，描画，入力に関する共有設定値を定義する
 * クライアントとサーバーで参照する定数群を提供する
 */
/** ゲーム全体で利用する共有設定値 */
export const GAME_CONFIG = {
  // ゲーム進行設定（クライアント/サーバー契約）
  GAME_DURATION_SEC: 180, // 1ゲームの制限時間（3分 = 180秒）
  GAME_START_DELAY_MS: 5000, // 開始通知から実際にゲーム進行を開始するまでの待機時間（ms）

  // ネットワーク同期設定（クライアント/サーバー契約）
  PLAYER_POSITION_UPDATE_MS: 50, // 座標送信間隔（20Hz）

  // グリッド（マス）設定（クライアント/サーバー契約）
  GRID_COLS: 40, // 横のマス数（グリッド単位）
  GRID_ROWS: 40, // 縦のマス数（グリッド単位）

  // プレイヤー挙動設定（内部座標はグリッド単位、契約値）
  PLAYER_RADIUS: 0.5, // プレイヤー半径（グリッド単位、目安: 0.05〜0.2）
  PLAYER_SPEED: 3, // 1秒当たりの移動量（グリッド単位）
  PLAYER_RENDER_SCALE: 1, // プレイヤー見た目サイズ倍率（1=等倍）
  PLAYER_HIT_STUN_MS: 1000, // 被弾時に入力を停止する時間（ms）

  // 爆弾設定（内部座標はグリッド単位、時間はms、契約値）
  BOMB_RADIUS_GRID: 1.5, // 爆風半径（グリッド単位、円形当たり判定）
  BOMB_RENDER_SCALE: 1.0, // 爆弾見た目サイズ倍率（1=等倍）
  BOMB_FUSE_MS: 1000, // 設置から爆発までの時間（ms）
  BOMB_COOLDOWN_MS: 3000, // 設置後に次の爆弾を置けるまでの待機時間（ms）
  BOMB_DEDUP_EXTRA_TTL_MS: 1000, // 重複排除保持時間の追加分（ms）

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

/** teamId が unknown を表す値か判定する */
export const isUnknownTeamId = (teamId: number): boolean => {
  return teamId === UNKNOWN_TEAM_ID;
};

/** teamId が有効範囲内かを真偽値で判定する */
export const isKnownTeamId = (teamId: number): boolean => {
  return (
    Number.isInteger(teamId) && teamId >= 0 && teamId < GAME_CONFIG.TEAM_COUNT
  );
};

/** TEAM_COUNT と TEAM_NAMES の整合性を検証する */
export const validateTeamConfig = (): void => {
  const { TEAM_COUNT } = GAME_CONFIG;

  if (TEAM_NAMES.length !== TEAM_COUNT) {
    throw new Error(
      `GAME_CONFIG mismatch: TEAM_NAMES length (${TEAM_NAMES.length}) must equal TEAM_COUNT (${TEAM_COUNT})`,
    );
  }
};

/** teamId が有効範囲内かを検証する */
export const assertValidTeamId = (teamId: number): void => {
  validateTeamConfig();

  const { TEAM_COUNT } = GAME_CONFIG;
  if (!Number.isInteger(teamId) || teamId < 0 || teamId >= TEAM_COUNT) {
    throw new Error(`Invalid teamId: ${teamId}`);
  }
};
