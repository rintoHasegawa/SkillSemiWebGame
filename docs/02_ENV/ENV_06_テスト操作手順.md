# テスト操作手順 (Test Operation Guide)

## 概要 (Overview)

本ドキュメントは，プロジェクト内のテスト関連ファイルの実行方法を整理し，チーム内で共通の運用手順を共有することを目的とする．

### 対象範囲

#### 対象ファイル

- テスト実行用スクリプト: `/workspace/test/load-bot.ts`
- テスト用依存定義: `/workspace/test/package.json`

#### 対象外

- アプリ本体のビルドと起動手順
- 本番運用の監視設定
- ユニットテスト（Vitest）: 実行コマンドは [ENV_04_開発コマンド](ENV_04_開発コマンド.md)，方針は `.claude/rules/testing.md` を参照

## 前提条件 (Prerequisites)

### 環境

- Node.js / pnpm が利用可能であること
- インターネット接続が利用可能であること

### 設定値

#### 接続先URL

- 既定値: `http://localhost:3000`
- 変更方法: 環境変数（`.env.local`）またはコマンドライン引数(`--dev`)で切り替える
  - `LOAD_TEST_SERVER_URL`: 本番接続先URL
  - `LOAD_TEST_DEV_SERVER_URL`: 開発接続先URL

## 実行手順 (Execution Steps)

### 初回準備

1. テスト用ディレクトリへ移動

   ```bash
   cd /workspace/test
   ```

2. 依存関係のインストール

   ```bash
   pnpm install
   ```

### 実行

```bash
pnpm start
```

開発環境に接続する場合:

```bash
pnpm start -- --dev
```

## パラメータ一覧 (Parameters)

### コマンドライン引数

- `--dev`: 開発環境(DEV_SERVER_URL)に接続する

### 定数 (load-bot.constants.ts)

#### 接続設定

- `URL`: 本番サーバURL（環境変数 `LOAD_TEST_SERVER_URL` で上書き可能，既定: `http://localhost:3000`）
- `DEV_URL`: 開発サーバURL（環境変数 `LOAD_TEST_DEV_SERVER_URL` で上書き可能，既定: `http://localhost:3000`）
- `SOCKET_PATH`: Socket.IOのパス（shared の NETWORK_CONFIG から取得）
- `SOCKET_TRANSPORTS`: Socket.IOのトランスポート（`["websocket", "polling"]`）

#### テスト実行設定

- `BOTS`: 同時接続するBot数（既定: 99）
- `DURATION_MS`: テスト実行時間 (ms)（既定: Infinity = 無期限）
- `JOIN_DELAY_MS`: Bot参加の間隔 (ms)（既定: 25）
- `START_DELAY_MS`: 接続からゲーム開始リクエストまでの遅延 (ms)（既定: 800）
- `ROOM_ID`: 参加するルームID（既定: "1"）
- `START_GAME`: 1体目のBotがゲーム開始を実行するか (true/false)

#### Bot動作設定

- `BOT_CAN_MOVE`: ボット移動の有効化 (true/false)
- `BOT_CAN_PLACE_BOMB`: ボム設置の有効化 (true/false)
- `MOVE_TICK_MS`: 移動送信間隔 (ms)（shared の GAME_CONFIG から取得）
- `BOT_SPEED`: 移動速度（shared の GAME_CONFIG から取得）
- `BOT_RADIUS`: プレイヤー半径（shared の GAME_CONFIG から取得）
- `BOMB_COOLDOWN_MS`: ボムのクールダウン (ms)（shared の GAME_CONFIG から取得）
- `BOMB_FUSE_MS`: ボムの爆発までの時間 (ms)（shared の GAME_CONFIG から取得）
- `MAX_X`: X座標上限（shared の GAME_CONFIG.GRID_COLS）
- `MAX_Y`: Y座標上限（shared の GAME_CONFIG.GRID_ROWS）

## 出力と終了 (Output & Termination)

### 標準出力

- 開始時に設定値が出力される
- 終了時に簡易統計 (接続数など) が出力される

### 終了方法

- 指定時間経過後に自動終了する
- 途中終了する場合はプロセスを終了する

## 注意事項 (Notes)

### 本番サーバへの負荷

- 負荷テストは低負荷から段階的に実施すること
- 必要に応じて管理者へ事前連絡を行うこと

### 依存関係

- test配下は独立した依存関係を持つため，別途 `pnpm install` が必要になる

### 計測の限界

- 本スクリプトは簡易負荷確認用であり，詳細な計測は専用ツールの利用を推奨する
