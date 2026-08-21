# 通信最適化 (Network Optimization)

## 概要 (Overview)

### 目的 (Purpose)

最大100人が同時接続するリアルタイム対戦ゲームにおいて，サーバー・クライアント間の通信帯域と
メッセージ数を最小化しつつ，低遅延な状態同期を実現する．

### 主要な最適化手法 (Key Optimization Techniques)

- AOI（関心領域）フィルタリング: プレイヤーの周辺データのみ送信する
- ティックバッチ送信: 50ms間隔で差分をまとめて1回送信する
- 座標量子化: 浮動小数点座標を丸めて帯域を削減する
- 差分同期: 前回送信値から変化した分のみ送信する
- マップセルのグループ化: セル更新をチームIDでまとめて送信する

## AOI（関心領域）フィルタリング (Area of Interest)

### 仕組み (Mechanism)

フィールド全体をAOIセル（3×3グリッド単位）に分割し，各プレイヤーの周辺ウィンドウ
（横5×縦3 AOIセル = 15×9グリッド）に含まれるデータのみを送信する．

### AOIグリッド設定 (AOI Grid Settings)

- AOIセルサイズ: 3グリッド単位
- AOIウィンドウ: 横5セル × 縦3セル

### フィルタリング対象 (Filtering Targets)

- プレイヤー位置更新（`UPDATE_PLAYERS`）
- ボム設置通知（`BOMB_PLACED`）
- ハリケーン更新（`UPDATE_HURRICANES`）

### AOIセルキャッシュ (AOI Cell Cache)

- 各ソケットごとに前回のAOIセル座標を保持する
- プレイヤーのAOIセルが変化した場合のみウィンドウ再計算を行う
- 同一セル内の移動ではフィルタリング処理をスキップする

### プレイヤー可視性管理 (Player Visibility Management)

各ソケットごとに以下のSetを保持し，AOI境界の出入りを検知する．

- `visiblePlayerIds`: 現在可視のプレイヤーIDセット
- `visibleBombIds`: 現在可視のボムIDセット
- `visibleHurricaneIds`: 現在可視のハリケーンIDセット

#### 出入り検知 (Enter/Leave Detection)

- 前回不可視 → 今回可視: `NEW_PLAYER`イベントを発行する
- 前回可視 → 今回不可視: `REMOVE_PLAYER`イベントを発行する
- 継続可視のプレイヤーのみ`UPDATE_PLAYERS`に含める

## 20Hzティック＆バッチ送信 (Tick-Based Batching)

### ティックレート (Tick Rate)

- サーバーゲームループ: 20Hz（50ms間隔）
- スケジュール方式: `setTimeout`で次回ティック時刻を正確に計算し，`setInterval`のドリフトを回避する

### バッチ処理 (Batch Processing)

1ティックで以下の処理をまとめて実行し，結果を1回で送信する．

1. ハリケーンの位置更新と衝突判定
2. Bot AIの行動決定と位置更新
3. マップの塗り処理と競合判定
4. ボムの爆発判定（Bot向け）
5. 差分データの組み立て

### 送信メッセージ（1ティックあたり最大） (Max Messages per Tick)

- `UPDATE_PLAYERS`: 位置が変化したプレイヤーのみ
- `UPDATE_MAP_CELLS`: 塗り状態が変化したセルのみ
- `UPDATE_HURRICANES`: 状態が変化したハリケーンのみ
- 変化がない種別のメッセージは送信しない

## 座標量子化 (Position Quantization)

### プレイヤー座標 (Player Position)

- 量子化スケール: 100（小数第2位で丸める）
- 計算式: `Math.round(value × 100) / 100`
- 例: 3.14159 → 3.14

### ハリケーン座標 (Hurricane Position)

- 位置の量子化スケール: 10（小数第1位で丸める）
- 回転の量子化スケール: 4（0.25刻み）
- プレイヤーより粗い精度で十分なため，帯域をさらに削減する

### 3層の量子化パイプライン（プレイヤー位置） (Three-Layer Quantization Pipeline)

1. クライアント送信時: 量子化後の座標が前回と同じなら送信をスキップする
2. サーバー受信時: 受信座標を再量子化して精度を統一する
3. サーバー送信時: 量子化後の座標で差分比較し，変化分のみ送信する

### 異常値ガード (Invalid Value Guard)

- NaN/Infinityの場合は0を返す
- 量子化スケールが無効（0以下）の場合は元の値をそのまま返す

## 差分同期 (Delta Synchronization)

### 汎用デルタ抽出ユーティリティ (Generic Delta Extraction Utility)

- `collectSyncDeltaEntries()`: IDベースのスナップショット比較を行う汎用関数
- 前回送信したスナップショットをMapで保持し，変化したエントリのみを返す
- プレイヤー位置同期とハリケーン同期の両方で共通利用する

### プレイヤー位置の差分 (Player Position Delta)

- ソケットごとに`lastSentPositionByPlayerId`を保持する
- 量子化後の座標が前回と同じプレイヤーは`UPDATE_PLAYERS`から除外する
- キャッシュは「直近に送った内容のみを表す」を不変条件とし，毎ティックの prune で送信スコープ外（可視集合外，または AOI フィルタで送信対象から外れた）のエントリを削除する（切断・AOI 離脱で残る幽霊エントリと，AOI 外で座標が変わらないまま戻ったプレイヤーが再送されない問題を防ぐ）

### UPDATE_PLAYERSのteamId省略 (Omitting teamId in UPDATE_PLAYERS)

- 初回接続時の`CURRENT_PLAYERS`で`teamId`を含む完全なPlayerDataを送信する
- 以降の`UPDATE_PLAYERS`では`id`, `x`, `y`のみ送信し，`teamId`を省略する
- 毎ティックのペイロードサイズを削減する

### ハリケーン同期の生存集合 (Hurricane Active-Set Sync)

- tick データの`HurricaneSyncData.activeHurricaneIds`で生存ハリケーンIDを毎ティック送信層へ渡す
- サーバのルームスナップショットは「生存集合に無いものを削除 → 差分を反映」でサーバ現存集合のミラーを維持する（消滅したハリケーンが全量同期`CURRENT_HURRICANES`に混入しない）
- 差分空・生存 0・スナップショット空のティックは受信者走査ごとスキップする（ハリケーン未出現中のコストをゼロに保つ）
- 可視 0 件でも全量側は空配列の`CURRENT_HURRICANES`を送る（「何も見えない」ことの状態確定．差分側の「変化がなければ送らない」とは意図的な非対称）
- スナップショット破棄（`clearRoomSnapshot`）は`realtimeRoomSyncState.resetRoom`と必ず対で呼ぶ（ゲーム開始・終了時）

## マップセルのグループ化 (Grouped Cell Updates)

### データ形式 (Data Format)

セル更新を個別のオブジェクト配列ではなく，チームIDをキーとしたグループ形式で送信する．

#### 変換前（個別形式） (Before: Individual Format)

```ts
[{ index: 5, teamId: 2 }, { index: 7, teamId: 2 }, { index: 10, teamId: 1 }]
```

#### 変換後（グループ形式: GroupedCellUpdates） (After: Grouped Format)

```json
{ "2": [5, 7], "1": [10] }
```

### 効果 (Effect)

- `teamId`キーの重複を排除し，ペイロードサイズを削減する
- セル数が多いほど圧縮効率が高くなる

### 差分のみ送信 (Delta-Only Transmission)

- MapStoreの`pendingUpdates`キューに変化セルのみを蓄積する
- 既に同じチームで塗られているセルはキューに追加しない
- `getAndClearUpdates()`でキューの参照をゼロコピーで差し替える

### 集約と検証 (Aggregation & Validation)

- `groupCellUpdates`は同一セルの重複更新をセル単位の後勝ちで集約する（各セルが 1 回しか現れないため，受信側の適用順に依存せず最終状態がサーバと一致する）
- `ungroupCellUpdates`は teamId キーを値域（未塗装 -1 とチーム 0〜3）で検証し，範囲外のエントリを読み飛ばす

## クライアント側の送信最適化 (Client-Side Send Optimization)

### 位置送信の間引き (Position Send Throttling)

- PlayerMoveSenderが量子化後の座標を前回送信値と比較する
- 変化がない場合は送信をスキップする
- 停止時には`force: true`オプションで最終座標を確実に送信する

### 送信間隔 (Send Interval)

- `PLAYER_POSITION_UPDATE_MS`: 50ms間隔でゲームループから呼び出される
- ティックレートと同期し，サーバーが処理可能な頻度に制限する

## パフォーマンス計測 (Performance Monitoring)

### 計測項目（1秒ウィンドウ単位） (Measured Metrics per 1-Second Window)

- `tickCount`: ウィンドウ内のティック数
- `avgTickMs`: ティックあたりの平均処理時間
- `maxTickMs`: ピーク処理時間
- `cpuUsagePct`: ゲームロジックのCPU使用率（= `totalTickMs / windowMs × 100`）
- `avgPayloadBytesPerTick`: ティックあたりの平均ペイロードサイズ
- `outboundBytesPerSec`: 推定送信帯域（= `avgPayload × playerCount × tickCount`）

### 活用 (Usage)

- 1秒ごとにログ出力し，ボトルネックの検知に利用する
- ティック処理が50msを超えた場合はキャッチアップ機構が作動する
