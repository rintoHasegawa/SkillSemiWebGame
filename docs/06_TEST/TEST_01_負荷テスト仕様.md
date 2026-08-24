# 負荷テスト仕様 (Load Test Specification)

## 概要 (Overview)

### 目的 (Purpose)

大人数同時接続時のサーバー安定性を検証する．
実際のプレイヤーと同等の通信・ゲームプレイをシミュレートするBotを
複数同時接続し，サーバーの処理能力と通信の健全性を確認する．

### テストツール (Test Tools)

- ファイル: `test/load-bot.ts`
- 言語: TypeScript（`ts-node` で直接実行）
- 通信: Socket.IO クライアント
- 設定ファイル: `test/load-bot.constants.ts`
- 環境変数: `test/.env.local`

### テスト構成 (Test Structure)

- 1体目のBot（index=0）がオーナーとしてルームを作成し，ゲーム開始を実行する
- 残りのBotが順次参加し，ゲーム中のプレイヤー動作をシミュレートする
- ゲーム終了通知を受信したら全Botが切断する

※ 環境構築・実行手順は docs/02_ENV/ENV_06_テスト操作手順.md を参照すること

## Botのシミュレーション動作 (Bot Behavior)

### 接続・入室 (Connection and Room Join)

#### 接続 (Connection)

- Socket.IOで指定URLに接続する
- トランスポート: websocket, polling
- 再接続: 無効（`reconnection: false`）
- タイムアウト: 10秒

#### 入室 (Room Join)

- 接続直後に`join-room`イベントを送信する
- プレイヤー名: `"bot-{index}"`（0始まり）
- ルームID: 定数で指定（既定: `"1"`）

#### 参加タイミングの分散 (Staggered Join Timing)

- 各Botの接続開始を `JOIN_DELAY_MS`（既定: 25ms）ずつずらす
- 接続スパイクによるサーバー負荷集中を回避する

### ゲーム開始 (Game Start)

#### オーナーBot（index=0）の動作 (Owner Bot Behavior)

- 接続後 `START_DELAY_MS`（既定: 800ms）経過後に`start-game`イベントを送信する
- 不足分はサーバー側でBot AIが補充される

#### 全Botの動作 (All Bots Behavior)

- `game-start`イベント受信後に`ready-for-game`を送信する
- `game-start`に含まれる`serverElapsedMs`が0になるまで待機してからゲームプレイを開始する
- `gridCols`/`gridRows`を受信し，フィールドサイズを動的に更新する

### クロック同期 (Clock Synchronization)

Botもクライアント本体と同じく，ゲーム時間には壁時計を使わず単調時計（`performance.now()`）のみを使う．詳細な方式は[TECH_02_時刻同期_ラグ対策](../05_TECH/TECH_02_時刻同期_ラグ対策.md)を参照．

#### Ping/Pong

- 5秒間隔で`ping`イベントを送信する（初回は接続直後に即時送信．送信値は単調時計の値）
- `pong`受信時に4つのタイムスタンプからRTTと`clockOffsetMs`を更新する
- サーバー滞留時間: `serverProcessingMs = serverSentElapsedMs - serverReceivedElapsedMs`
- RTT計測: `rttMs = (受信時刻 - clientTime) - serverProcessingMs`
- 計算式: `clockOffsetMs = serverSentElapsedMs - (受信時刻 - rttMs / 2)`
- `clockOffsetMs`は「クライアント単調時計 → サーバーのゲーム経過ms」への変換差分である
- RTTが負になるサンプルは棄却する

#### game-start時の補正 (Correction at Game Start)

- `game-start`ペイロードの`serverElapsedMs`で`clockOffsetMs`を暫定的に置く
- この値は片道遅延を補正していないため真値より過小だが，`pong`未着でもカウントダウンを開始できる

#### 経過時間の算出 (Elapsed Time Calculation)

- 符号付き経過: `getSignedElapsedMs() = 単調時計 + clockOffsetMs`（カウントダウン中は負，未同期時は`null`）
- 経過時間: `getElapsedMs() = max(0, getSignedElapsedMs())`
- ボムの爆発判定やフィーバータイム判定に使用する

### 移動 (Movement)

#### 移動方式 (Movement Method)

- `MOVE_TICK_MS`（既定: 50ms）間隔で位置を更新し，`move`イベントを送信する
- ランダムな角度で方向を決定し，`BOT_SPEED`で直線移動する
- フィールド端に到達したら方向をランダムに再設定する（壁反射）

#### ハリケーン回避 (Hurricane Avoidance)

- ハリケーンの直径×1.5の範囲内に入った場合，逃げる方向へ移動方向を変更する
- 複数のハリケーンが近い場合，回避ベクトルを合算して逃げる方向を決定する

#### スタン中の動作 (Behavior While Stunned)

- `isStunned()`がtrueの間は移動とボム設置をスキップする

### ボム設置 (Bomb Placement)

#### 設置条件 (Placement Conditions)

- `BOT_CAN_PLACE_BOMB`がtrueであること
- ゲームが開始済みであること
- スタン中でないこと
- 前回設置からクールダウン時間が経過していること

#### クールダウン (Cooldown)

- 通常時: `BOMB_NORMAL_COOLDOWN_MS`（既定: 4000ms）
- フィーバータイム時: `BOMB_FEVER_COOLDOWN_MS`（既定: 2000ms）
- フィーバー判定: 残り時間 ≤ 60秒

#### 送信データ (Sent Data)

- `requestId`: `"{botIndex}-{serial}"` で一意に生成する
- `x`, `y`: Botの現在座標
- `explodeAtElapsedMs`: 現在の経過時間 + `BOMB_FUSE_MS`

#### 設置タイミング (Placement Timing)

- 移動tickのたびに設置条件を判定し，条件を満たせば即座に設置する

### 被弾・リスポーン (Hit and Respawn)

#### 爆弾の被弾判定 (Bomb Hit Detection)

- 他プレイヤーの`bomb-placed`イベントを受信し，`trackedBombs`に登録する
- 100ms間隔で爆発時刻に達したボムを走査する
- 爆発範囲（`BOMB_RADIUS_GRID + PLAYER_RADIUS`）内にいれば被弾処理を実行する
- 自チームのボムは友軍撃ちとして無視する（`ownerTeamId === myTeamId`）

#### 被弾処理（爆弾・ハリケーン共通） (Hit Handling for Bombs and Hurricanes)

- `hitCount`を1増加させる
- 5回未満: `PLAYER_HIT_STUN_MS`（既定: 1000ms）のスタンを適用する
- 5回到達: リスポーンを実行する
  - `hitCount`を0にリセットする
  - `PLAYER_RESPAWN_STUN_MS`（既定: 2000ms）のスタンを適用する
  - スタン明け後の次回tickMoveで初期スポーン座標に戻る

#### 爆弾の被弾報告 (Bomb Hit Report)

- 被弾と判定した場合，`bomb-hit-report`イベント（`bombId`）をサーバーに送信する
- サーバーは`player-hit`を被弾者以外に送信するため，自分の`hitCount`はクライアント側で管理する

#### ハリケーン被弾 (Hurricane Hit)

- `hurricane-hit`イベントで自分の`playerId`が含まれていれば被弾処理を実行する

### ゲーム終了 (Game End)

#### 終了処理 (End Handling)

- `game-end`または`game-result`イベントを受信したら以下を実行する
  - `gameEnded`フラグをtrueに設定する
  - 全タイマー（移動・Ping・ボム判定）を停止する
  - ソケットを切断する

## 統計収集 (Statistics)

### 収集項目 (Collected Metrics)

- `connected`: 接続成功数
- `joined`: ルーム参加数
- `startSent`: ゲーム開始リクエスト送信数
- `moveSent`: 移動イベント送信数
- `disconnects`: 切断数
- `errors`: 接続エラー数
- `gameStarts`: ゲーム開始通知受信数

### 出力タイミング (Output Timing)

- テスト開始時: 設定値一覧を標準出力する
- テスト終了時: 最終統計を標準出力する

## 確認観点 (Verification Points)

### サーバー安定性 (Server Stability)

- 指定Bot数での同時接続中にサーバーがクラッシュしないこと
- 全Botが正常にルーム参加・ゲーム開始できること
- ゲーム終了まで切断エラーが発生しないこと

### パフォーマンス (Performance)

- サーバーのティック処理時間が50ms以内に収まること
  - サーバーログの `avgTickMs` / `maxTickMs` を確認する
- CPU使用率（`cpuUsagePct`）が許容範囲内であること
- 推定送信帯域（`outboundBytesPerSec`）が過大でないこと

### ゲームプレイの正常性 (Gameplay Correctness)

- Botの移動座標がサーバーに正しく同期されること
- ボムの設置・爆発が正常に処理されること
- 被弾・リスポーンが正常に動作すること
- ハリケーンの出現・被弾が正常に処理されること

### 段階的テスト (Incremental Testing)

- 少数（4〜8体）から開始し，段階的にBot数を増やすこと
- 各段階でサーバーログを確認してからBot数を引き上げる
- 本番サーバーに対して実施する場合は管理者へ事前連絡すること
