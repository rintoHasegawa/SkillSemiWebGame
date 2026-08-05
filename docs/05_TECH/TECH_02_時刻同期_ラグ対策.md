# 時刻同期・ラグ対策 (Clock Synchronization & Lag Mitigation)

## 概要 (Overview)

### 目的 (Purpose)

通信遅延が存在する環境で，全クライアントとサーバーが同じゲーム内時刻を共有し，
ボムの爆発タイミングなどの時間依存イベントを全端末で同時に発生させる．

### 主要な手法 (Key Techniques)

- Ping/Pongクロック同期: RTT計測によるクライアント・サーバー間の時刻差推定
- EWMA平滑化: 外れ値を除去し安定したオフセットを維持する
- 適応的同期間隔: ネットワーク品質に応じて同期頻度を自動調整する
- ボムの爆発時刻指定: 経過時間ベースでラグに依存しない爆発判定を行う
- クライアントサイド予測: ボム設置をローカルで即座に反映する
- ティックキャッチアップ: サーバー遅延時の連続ティック処理と暴走防止

## Ping/Pongクロック同期 (Clock Synchronization)

### プロトコル (Protocol)

1. クライアントが`PING`イベントで現在のクライアント時刻（`clientTime`）を送信する
2. サーバーが`PONG`イベントで`clientTime`とサーバー時刻（`serverTime`）を返す
3. クライアントが`PONG`受信時刻からRTTとオフセットを算出する

### RTT・オフセット算出 (RTT and Offset Calculation)

- RTT計測: `measuredRttMs` = `PONG`受信時刻 - `clientTime`
- 片道遅延推定: `estimatedOneWayMs = measuredRttMs / 2`
- オフセット算出: `offsetMs = serverTime - (clientTime + estimatedOneWayMs)`
- このオフセットを加算することで，クライアント時刻をサーバー時刻に変換できる

### RTT外れ値フィルタ (RTT Outlier Filter)

- 負のRTT: 棄却する（時計の巻き戻りや異常パケット）
- 1000ms超のRTT: 棄却する（ネットワーク異常として無視）
- バリデーション失敗時は`null`を返し，オフセット更新をスキップする

## EWMA平滑化 (Exponential Weighted Moving Average)

### オフセットの平滑化 (Offset Smoothing)

- アルファ値: 0.12（約8サンプル分の移動平均に相当）
- 計算式: `smoothed = current × (1 - 0.12) + measured × 0.12`
- 効果: 単一のノイジーなサンプルの影響を緩和し，安定したオフセットを維持する

### RTTの平滑化 (RTT Smoothing)

- アルファ値: 0.25（約4サンプル分の移動平均に相当）
- オフセットより高いアルファ値で，ネットワーク状態の変化に素早く追従する

### ジャンプ検出 (Jump Detection)

- しきい値: 250ms
- 前回のオフセットとの差が250msを超えるサンプルは棄却する
- Wi-Fi切り替えやネットワーク経路変更による急激な変動を吸収する

## 適応的同期間隔 (Adaptive Sync Interval)

### RTTに応じた同期頻度 (RTT-Based Sync Frequency)

- RTT ≤ 80ms（低遅延）: 5000ms間隔で同期する
- RTT ≤ 180ms（中遅延）: 3000ms間隔で同期する
- RTT > 180ms（高遅延）: 2000ms間隔で同期する
- RTT未取得（初期状態）: 3000ms間隔で同期する

### 可変間隔ループ (Variable Interval Loop)

- `setTimeout`ベースで毎回次の同期間隔を再計算する
- ネットワーク品質の変化にリアルタイムで適応する
- 低遅延環境では同期頻度を下げて不要なトラフィックを削減する

## ボムの爆発時刻指定方式 (Elapsed-Time-Based Bomb Detonation)

### 仕組み (Mechanism)

ボムの爆発タイミングをサーバー時刻ではなく，ゲーム開始からの経過時間で指定する．

#### 設置時の流れ (Placement Flow)

1. クライアントが設置時の経過時間に`BOMB_FUSE_MS`（1000ms）を加算する
   - `explodeAtElapsedMs` = 現在の経過時間 + 1000
2. PlaceBombPayloadに`explodeAtElapsedMs`を含めてサーバーに送信する
3. サーバーがActiveBombRegistryに登録し，全クライアントにブロードキャストする

#### 爆発判定 (Detonation Check)

- クライアント: 各フレームで`elapsedMs >= explodeAtElapsedMs`ならば爆発状態に遷移する
- サーバー: 各ティックで同条件を判定し，Bot向けの被弾判定を実行する

### ラグ耐性 (Lag Tolerance)

- 全端末が同じ「経過時間」で判定するため，個別の通信遅延に影響されない
- サーバーACKを待たずにクライアントが独立して爆発を判定できる
- Ping/Pongクロック同期により経過時間の基準が揃っている

### ボムの状態遷移 (Bomb State Transitions)

- `armed`（設置中）: 設置〜爆発まで
- `exploded`（爆発中）: 爆発〜250ms後まで（爆発エフェクト表示期間）
- `finished`（完了）: エフェクト終了後，描画から除去する

## ボム重複排除 (Bomb Deduplication)

### 重複排除キー (Deduplication Key)

- 形式: `"ownerPlayerId:requestId"`
- クライアントが生成する`requestId`とソケットIDの組み合わせで一意性を保証する

### TTL管理 (TTL Management)

- 有効期間: `BOMB_FUSE_MS + BOMB_DEDUP_EXTRA_TTL_MS` = 1000 + 1000 = 2000ms
- チェック時に期限切れエントリを自動クリーンアップする
- 同一キーが存在する場合はブロードキャストをスキップする

### 防止する問題 (Prevented Issues)

- パケット再送による重複設置
- 同一ボムの複数回ブロードキャスト
- 爆発後の遅延リクエスト処理

## クライアントサイド予測 (Client-Side Prediction)

### ボム設置の即時反映 (Immediate Bomb Placement)

サーバーの応答を待たずにボムをローカルに描画し，体感遅延を解消する．

#### フェーズ1: 楽観的設置 (Phase 1: Optimistic Placement)

1. BombIdRegistryが一時ID（`temp:requestId`）を発行する
2. 一時IDでボムをBombRepositoryに登録し，即座に描画する
3. サーバーにPlaceBombPayloadを送信する

#### フェーズ2: ACK後の差し替え (Phase 2: Replacement After ACK)

1. サーバーから`BOMB_PLACED_ACK`（`bombId`, `requestId`）を受信する
2. `requestId`から一時IDを逆引きする
3. 一時IDのボムを削除し，正式な`bombId`で再登録する

### 効果 (Effect)

- ボム設置のレスポンスが通信遅延（RTT/2）分だけ早く感じられる
- サーバーが拒否した場合は一時ボムを削除するだけで整合性を保てる

## ティックキャッチアップ (Tick Catch-Up)

### 遅延回復機構 (Delay Recovery Mechanism)

サーバーのティック処理が50msを超えた場合，遅れを回復するために連続ティックを実行する．

#### キャッチアップルール (Catch-Up Rules)

- 1サイクルあたり最大3ティックまで連続処理する
- 3ティック処理後も遅延が残る場合は，次回ティック時刻を現在時刻にリセットする
- これにより「キャッチアップスパイラル」（遅延が蓄積し続ける状態）を防止する

### スケジュール方式 (Scheduling Method)

- `setTimeout`で次回ティックの正確な時刻を計算する
- `setInterval`のドリフト（累積誤差）を回避する
- 各サイクル開始時に`nowMs`を取得し，`nextTickAtMs`との差分で判定する

## マップの競合判定 (Map Contest Resolution)

### 問題 (Problem)

同一セルに複数チームのプレイヤーが同時に存在する場合，どのチームが塗るかが不定になる．

### 解決策 (Solution)

- 各ティックで全プレイヤーのグリッド座標を1パスで収集する
- `cellTeamMap`（`Map<gridIndex, teamId>`）を構築する
- 同一セルに異なるチームIDが検出された場合，`CONTESTED_CELL`（-2）を設定する
- `CONTESTED_CELL`のセルは塗り処理をスキップする

### 効果 (Effect)

- 不公平な陣地獲得を防止する
- 1パスで処理が完了し，計算コストが低い
