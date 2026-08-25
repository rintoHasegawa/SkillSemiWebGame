# Config README

このファイルは config 定数の管理台帳です。  
配置ルール・責務境界・定数一覧はここを正とします。

## 配置ルール

- shared契約（client/serverで一致が必要）: [packages/shared/src/config](packages/shared/src/config)
- client表示・操作系: [apps/client/src/config/index.ts](apps/client/src/config/index.ts)
- server運用・受け入れ系: [apps/server/src/config/index.ts](apps/server/src/config/index.ts)

## 定数一覧

### shared

対象: [packages/shared/src/config/gameConfig.ts](packages/shared/src/config/gameConfig.ts), [packages/shared/src/config/networkConfig.ts](packages/shared/src/config/networkConfig.ts)

- `GAME_CONFIG.GAME_DURATION_SEC`: 1ゲームの制限時間（秒）
- `GAME_CONFIG.PLAYER_POSITION_UPDATE_MS`: プレイヤー座標を同期送信する間隔（ms）
- `GAME_CONFIG.GRID_COLS`: マップ横方向のグリッド数
- `GAME_CONFIG.GRID_ROWS`: マップ縦方向のグリッド数
- `GAME_CONFIG.PLAYER_RADIUS`: プレイヤー当たり判定半径（グリッド単位）
- `GAME_CONFIG.PLAYER_SPEED`: プレイヤー移動速度（1秒あたりのグリッド移動量）
- `GAME_CONFIG.PLAYER_HIT_STUN_MS`: 被弾時に入力を停止する時間（ms）
- `GAME_CONFIG.BOMB_RADIUS_GRID`: 爆風半径（グリッド単位）
- `GAME_CONFIG.BOMB_FUSE_MS`: 爆弾設置から爆発までの時間（ms）
- `GAME_CONFIG.BOMB_COOLDOWN_MS`: 次の爆弾を置けるまでの待機時間（ms）
- `GAME_CONFIG.BOMB_DEDUP_EXTRA_TTL_MS`: サーバー側の爆弾重複排除で保持時間に加算する猶予（ms）
- `GAME_CONFIG.BOMB_HIT_REPORT_RETENTION_MS`: 爆発後も被弾報告を受理し爆弾レコードを保持する猶予（ms）
- `GAME_CONFIG.BOMB_HIT_REPORT_DISTANCE_MARGIN_GRID`: 被弾報告の距離検証で爆風半径とプレイヤー半径へ加算するマージン（グリッド単位）
- `GAME_CONFIG.TEAM_COUNT`: チーム総数
- `MAX_FIELD_GRID_SIZE`: 全フィールドサイズ種別中で最大のグリッドサイズ（受信座標の範囲検証に利用）
- `isFieldSizePreset`: 値が定義済みのフィールドサイズ種別かを判定する関数
- `resolveFieldGridSize`: フィールドサイズ種別から実グリッドサイズを解決する関数（未定義の種別は既定プリセットへフォールバック）
- `TEAM_NAMES`: `teamId` 順の表示名配列
- `validateTeamConfig`: チーム関連設定（件数整合性）を検証する関数
- `assertValidTeamId`: `teamId` が有効範囲内かを検証する関数
- `NETWORK_CONFIG.SOCKET_IO_PATH`: Socket.IO 接続パス（client/server共通契約）

### client

対象: [apps/client/src/config/index.ts](apps/client/src/config/index.ts)

- `GAME_CONFIG.TIMER_DISPLAY_UPDATE_MS`: 画面の残り時間表示を更新する間隔（ms）
- `GAME_CONFIG.JOIN_REQUEST_TIMEOUT_MS`: ルーム参加要求のタイムアウト時間（ms）
- `GAME_CONFIG.PLAYER_LERP_SMOOTHNESS`: リモートプレイヤー補間の追従係数（大きいほど追従が速い）
- `GAME_CONFIG.PLAYER_LERP_SNAP_THRESHOLD`: 補間終了時に目標座標へ吸着する閾値
- `GAME_CONFIG.GRID_CELL_SIZE`: 1グリッドの描画サイズ（px）
- `GAME_CONFIG.TEAM_COLORS`: `teamId` 順の描画色（16進カラー文字列）
- `GAME_CONFIG.MAP_BG_COLOR`: マップ背景色（Pixi用16進数）
- `GAME_CONFIG.MAP_GRID_COLOR`: グリッド線の色（Pixi用16進数）
- `GAME_CONFIG.MAP_BORDER_COLOR`: マップ外周線の色（Pixi用16進数）
- `GAME_CONFIG.MAP_WIDTH_PX` (getter): マップ横幅（`GRID_COLS * GRID_CELL_SIZE`）
- `GAME_CONFIG.MAP_HEIGHT_PX` (getter): マップ縦幅（`GRID_ROWS * GRID_CELL_SIZE`）
- `GAME_CONFIG.PLAYER_RADIUS_PX` (getter): プレイヤー半径の描画サイズ（px）
- `NETWORK_CONFIG.DEV_SERVER_HOST`: 開発環境の接続先ホスト
- `NETWORK_CONFIG.DEV_SERVER_PORT`: 開発環境の接続先ポート
- `NETWORK_CONFIG.DEV_SERVER_URL` (getter): 開発環境の接続先URL（host + port）
- `NETWORK_CONFIG.PROD_SERVER_URL`: 本番環境の接続先URL
- `NETWORK_CONFIG.SOCKET_TRANSPORTS`: Socket.IO の許可トランスポート種別
- `NETWORK_CONFIG.SOCKET_IO_PATH`: Socket.IO 接続パス（shared契約を再利用）

### server

対象: [apps/server/src/config/index.ts](apps/server/src/config/index.ts)

- `GAME_CONFIG.MAX_PLAYERS_PER_ROOM`: 1ルームに参加できる最大人数
- `NETWORK_CONFIG.DEV_SERVER_PORT`: サーバー起動時の待受ポート（環境変数未指定時）
- `NETWORK_CONFIG.CORS_METHODS`: CORS で許可するHTTPメソッド
- CORS の許可オリジンは config 定数ではなく環境変数 `CORS_ORIGIN` から解決する（[apps/server/src/network/bootstrap/corsPolicy.ts](../../../../apps/server/src/network/bootstrap/corsPolicy.ts)）。詳細は [ENV_09_環境変数設定](../../../../docs/02_ENV/ENV_09_環境変数設定.md) を参照

## 追加・変更ルール

- 変更時に client と server の同時反映が必須なら shared に追加する
- 片側のみで完結する値はその側の config に追加する
- 未使用の定数は原則削除する
- 将来利用予定で残す場合は、このREADMEに理由と予定利用箇所を追記する
