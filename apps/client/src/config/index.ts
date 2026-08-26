import { config as sharedConfig } from "@repo/shared";
import type { FieldSizePreset, GameStartPayload } from "@repo/shared";

const runtimeMapSize = {
  gridCols: sharedConfig.GAME_CONFIG.GRID_COLS,
  gridRows: sharedConfig.GAME_CONFIG.GRID_ROWS,
};

/** フィールドサイズ種別からクライアント実行中のマップサイズを更新する */
export const setRuntimeMapSizeByPreset = (preset: FieldSizePreset): void => {
  const resolved = sharedConfig.resolveFieldGridSize(preset);
  runtimeMapSize.gridCols = resolved.cols;
  runtimeMapSize.gridRows = resolved.rows;
};

// 受信したグリッドサイズがフィールドプリセット上限内の正の整数か判定する
const isAcceptableRuntimeGridSize = (cols: number, rows: number): boolean => {
  return (
    Number.isInteger(cols)
    && Number.isInteger(rows)
    && cols > 0
    && rows > 0
    && cols <= sharedConfig.MAX_FIELD_GRID_SIZE.cols
    && rows <= sharedConfig.MAX_FIELD_GRID_SIZE.rows
  );
};

/** GAME_STARTペイロードを優先してクライアント実行中のマップサイズを更新する */
export const applyRuntimeMapSizeFromGameStart = (
  payload: Pick<GameStartPayload, "fieldSizePreset" | "gridCols" | "gridRows">,
): void => {
  if (isAcceptableRuntimeGridSize(payload.gridCols, payload.gridRows)) {
    runtimeMapSize.gridCols = payload.gridCols;
    runtimeMapSize.gridRows = payload.gridRows;
    return;
  }

  // 想定外のグリッドサイズはマップ配列確保を破綻させるため採用せずプリセットへ戻す
  console.error("[config] GAME_STARTのグリッドサイズが許容範囲外", {
    gridCols: payload.gridCols,
    gridRows: payload.gridRows,
  });
  setRuntimeMapSizeByPreset(payload.fieldSizePreset);
};

/** クライアント実行中マップサイズを既定値へ戻す */
export const resetRuntimeMapSizeToDefault = (): void => {
  setRuntimeMapSizeByPreset(sharedConfig.GAME_CONFIG.DEFAULT_FIELD_PRESET);
};

const sharedBombRenderScale =
  (sharedConfig.GAME_CONFIG as { BOMB_RENDER_SCALE?: number })
    .BOMB_RENDER_SCALE ?? 1;

const sharedRespawnHitCount =
  (sharedConfig.GAME_CONFIG as { PLAYER_RESPAWN_HIT_COUNT?: number })
    .PLAYER_RESPAWN_HIT_COUNT ?? 5;

const sharedRespawnStunMs =
  (sharedConfig.GAME_CONFIG as { PLAYER_RESPAWN_STUN_MS?: number })
    .PLAYER_RESPAWN_STUN_MS ?? sharedConfig.GAME_CONFIG.PLAYER_HIT_STUN_MS;

const sharedRespawnEffectScale =
  (sharedConfig.GAME_CONFIG as { PLAYER_RESPAWN_EFFECT_SCALE?: number })
    .PLAYER_RESPAWN_EFFECT_SCALE ?? 2.4;

const CLIENT_GAME_CONFIG = {
  TIMER_DISPLAY_UPDATE_MS: 250,
  JOIN_REQUEST_TIMEOUT_MS: 8000,

  FRAME_DELTA_MAX_MS: 50,

  PLAYER_RESPAWN_HIT_COUNT: sharedRespawnHitCount,
  PLAYER_RESPAWN_STUN_MS: sharedRespawnStunMs,
  PLAYER_RESPAWN_EFFECT_SCALE: sharedRespawnEffectScale,

  PLAYER_LERP_SMOOTHNESS: 18,
  PLAYER_LERP_SNAP_THRESHOLD: 0.005,
  PLAYER_HIT_EFFECT: {
    BLINK_DURATION_MS: sharedConfig.GAME_CONFIG.PLAYER_HIT_STUN_MS,
    BLINK_INTERVAL_MS: 100,
    BLINK_HIDDEN_ALPHA: 0.2,
    BLINK_MAX_DELTA_MS: 50,
    DEDUP_WINDOW_MS: 300,
  },

  GRID_CELL_SIZE: 100,

  TEAM_COLORS: ["#FF4B4B", "#4B4BFF", "#4BFF4B", "#FFD700"],

  // 爆発までの残り時間リングゲージ（爆弾スプライト外周からの余白と線の見た目）
  BOMB_FUSE_GAUGE: {
    RADIUS_MARGIN_PX: 7,
    THICKNESS_PX: 4,
    OUTLINE_WIDTH_PX: 1,
    TRACK_COLOR: 0x000000,
    TRACK_ALPHA: 0.45,
    OUTLINE_COLOR: 0xffffff,
  },

  MAP_BG_COLOR: 0x111111,
  MAP_GRID_COLOR: 0x333333,
  MAP_BORDER_COLOR: 0xff4444,
  CLOCK_SYNC: {
    ESTIMATOR: {
      MAX_ACCEPTED_RTT_MS: 1000,
    },
    OFFSET_TRACKER: {
      SAMPLE_WINDOW_SIZE: 8,
      MAX_SLEW_PER_SAMPLE_MS: 50,
      RTT_ALPHA: 0.25,
    },
    INTERVAL_POLICY: {
      DEFAULT_INTERVAL_MS: 3000,
      LOW_LATENCY_THRESHOLD_MS: 80,
      MEDIUM_LATENCY_THRESHOLD_MS: 180,
      LOW_LATENCY_INTERVAL_MS: 5000,
      MEDIUM_LATENCY_INTERVAL_MS: 3000,
      HIGH_LATENCY_INTERVAL_MS: 2000,
    },
  },
} as const;

const GAME_CONFIG = {
  ...sharedConfig.GAME_CONFIG,
  ...CLIENT_GAME_CONFIG,
  get GRID_COLS(): number {
    return runtimeMapSize.gridCols;
  },
  get GRID_ROWS(): number {
    return runtimeMapSize.gridRows;
  },
  get MAP_WIDTH_PX(): number {
    return this.GRID_COLS * this.GRID_CELL_SIZE;
  },
  get MAP_HEIGHT_PX(): number {
    return this.GRID_ROWS * this.GRID_CELL_SIZE;
  },
  get PLAYER_RADIUS_PX(): number {
    return this.PLAYER_RADIUS * this.GRID_CELL_SIZE;
  },
  get BOMB_RENDER_RADIUS_PX(): number {
    return this.GRID_CELL_SIZE * 0.2 * sharedBombRenderScale;
  },
  get BOMB_FUSE_GAUGE_RADIUS_PX(): number {
    return this.BOMB_RENDER_RADIUS_PX + this.BOMB_FUSE_GAUGE.RADIUS_MARGIN_PX;
  },
  get PLAYER_RESPAWN_EFFECT_SIZE_PX(): number {
    return this.PLAYER_RADIUS_PX * 2 * this.PLAYER_RESPAWN_EFFECT_SCALE;
  },
} as const;

const NETWORK_CONFIG = {
  DEV_SERVER_HOST: "http://localhost",
  DEV_SERVER_PORT: 3000,
  get DEV_SERVER_URL() {
    return `${this.DEV_SERVER_HOST}:${this.DEV_SERVER_PORT}`;
  },
  PROD_SERVER_URL: import.meta.env?.VITE_PROD_SERVER_URL,
  SOCKET_TRANSPORTS: ["websocket", "polling"],
  SOCKET_IO_PATH: sharedConfig.NETWORK_CONFIG.SOCKET_IO_PATH,
} as const;

export const config = {
  ...sharedConfig,
  GAME_CONFIG,
  NETWORK_CONFIG,
} as const;
