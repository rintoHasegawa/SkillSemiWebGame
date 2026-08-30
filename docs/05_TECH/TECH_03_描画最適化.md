# 描画最適化 (Rendering Optimization)

## 概要 (Overview)

### 目的 (Purpose)

PixiJSによるリアルタイム描画において，大人数・大マップでも60fpsを維持するための
クライアント側の描画最適化手法を中心にまとめる．一部，サーバー側のティック処理の
最適化（Bot JITウォームアップ）も含む．

### 主要な最適化手法 (Key Optimization Techniques)

- ビューポートカリング: 画面外のエンティティの描画をスキップする
- 画面外プレイヤーの間引き更新: 不可視プレイヤーのtick頻度を削減する
- プレイヤー補間（LERP）: リモートプレイヤーの位置を滑らかに補間する
- フレームデルタクランプ: 異常なデルタタイムを制限する
- テクスチャキャッシュ: 同一アセットの重複ロードを防止する
- マップの差分描画: 変化セルのみを再描画する
- Bot JITウォームアップ: ゲーム開始前にV8 JITコンパイルを促進する

## ビューポートカリング (Viewport Culling)

### 仕組み (Mechanism)

カメラの表示範囲外にあるエンティティの`visible`プロパティを`false`に設定し，
PixiJSの描画パイプラインから除外する．

### カリング対象 (Culling Targets)

- プレイヤー（PlayerView）
- ボム（BombView）
- ハリケーン（HurricaneOverlayController）

### 判定方法 (Detection Method)

- 円の外接矩形-矩形交差判定（`isCircleBoundsIntersectingViewport`）を使用する
- エンティティの半径円の外接矩形（AABB）とビューポート矩形の交差を判定する
- ※ 角の内外は厳密に判定しないため，カリングとしては安全側（過剰に可視と判定）に働く

### カリングマージン (Culling Margin)

- ビューポートを`GRID_CELL_SIZE`分だけ拡張する（`expandWorldViewport`）
- マージンにより画面端でのエンティティのポップイン（突然の出現）を防止する

### 遅延描画 (Lazy Rendering)

- ハリケーンは可視状態に変化した瞬間のみ`renderDisplayFromState()`を呼び出す
- 不可視→可視の遷移時のみ再描画し，可視継続中は通常のtick更新のみ行う

## 画面外プレイヤーの間引き更新 (Offscreen Update Throttling)

### 仕組み (Mechanism)

画面外のリモートプレイヤーのtick処理を6フレームに1回に間引く．

### 実装 (Implementation)

- フレームカウンタ: `frameCount % 6 === 0` のフレームのみ画面外プレイヤーをtickする
- デルタタイム補正: 間引き時は `deltaSeconds × 6` を渡し，位置精度を維持する
- 画面内プレイヤー: 毎フレーム通常の`deltaSeconds`でtickする

### 効果 (Effect)

- 画面外プレイヤーの更新コストを約1/6に削減する
- デルタタイム補正により，画面内に戻った際の位置ずれを防止する

## プレイヤー補間 (Player Interpolation)

### リモートプレイヤーのLERP (Remote Player LERP)

サーバーから受信した目標座標に向けて，フレームごとに滑らかに補間移動する．

#### 計算式 (Formula)

```text
newPos = currentPos + (targetPos - currentPos) × LERP_SMOOTHNESS × deltaTime
```

- `LERP_SMOOTHNESS`: 設定値で補間速度を制御する
- `deltaTime`を乗算し，フレームレートに依存しない一定速度の補間を実現する

### スナップ閾値 (Snap Threshold)

- 現在位置と目標位置の距離が`PLAYER_LERP_SNAP_THRESHOLD`を下回る場合，即座に目標位置に移動する
- 微小な揺れ（ジッター）を防止する

### 効果 (Effect)

- 20Hz（50ms間隔）の位置更新でも60fpsで滑らかに見える
- サーバーからの位置が急に変わった場合もスムーズに追従する

## フレームデルタクランプ (Frame Delta Clamping)

### 問題 (Problem)

フレーム落ちやタブ非表示からの復帰時に，`deltaTime`が異常に大きくなり
物理計算の暴走（プレイヤーが瞬間移動する等）が発生する．

### 解決策 (Solution)

- `resolveFrameDelta()`関数で`deltaTime`の上下限を制限する
- 下限: 0（負の値やNaNを防止する）
- 上限: `FRAME_DELTA_MAX_MS`（設定された最大値）

### 適用範囲 (Scope)

- プレイヤーの移動計算
- LERP補間
- ボム・ハリケーンの状態更新
- 全ての時間依存処理がこのクランプ済みデルタを使用する

## テクスチャキャッシュ (Texture Caching)

### モジュールレベルキャッシュ (Module-Level Cache)

SVGアセットのテクスチャをモジュールスコープの変数にキャッシュし，
複数のインスタンスから参照しても1回だけロードする．

#### キャッシュパターン (Cache Pattern)

- `cachedTexture`: ロード完了後のTexture参照を保持する
- `texturePromise`: ロード中のPromise参照を保持する
- 初回呼び出し: `Assets.load()`でPromiseを生成し，`texturePromise`に保存する
- 2回目以降: 既存のPromiseをawaitする（追加のフェッチは発生しない）
- ロード完了後: `cachedTexture`から即座に返す

### キャッシュ対象 (Cache Targets)

- 爆発エフェクト（`bakuhatueffe.svg`）: RespawnEffectTextureCache
- ハリケーン（`hurricane.svg`）: HurricaneTextureCache
- ボム（`Bomb.svg`）: BombViewの静的テクスチャ

### アセットプリロード (Asset Preloading)

- `preloadGameStartAssets()`をゲーム開始前に呼び出す
- 重いSVGアセットを事前にキャッシュし，初回出現時のフレーム落ちを防止する
- void（fire-and-forget）で呼び出し，ゲーム開始をブロックしない

## マップの差分描画 (Differential Map Rendering)

### セル単位の更新 (Per-Cell Updates)

- GameMapViewはセルごとにGraphicsオブジェクトをコンストラクタで事前確保する
- `renderCell(index, color)`で変化したセルのみを再描画する
- 全セルの再描画は行わない

### 描画手順 (Rendering Procedure)

1. 対象セルの`Graphics.clear()`で前回の描画を消去する
2. 新しい色で`Graphics.fill()`を適用する
3. 未塗装（-1）のセルは既定の背景色を使用する

### リビジョン管理 (Revision Management)

- GameMapModelが`applyUpdates()`のたびにリビジョン番号をインクリメントする
- ミニマップ等のUI要素はリビジョン変化時のみ再描画する

## 状態変化キャッシュ (State Change Caching)

### ボムの描画スキップ (Bomb Render Skipping)

- BombViewが前回描画した状態（`state`, `color`, `radiusGrid`）を保持する
- 状態が変化していない場合は`render()`をスキップする
- `armed`状態のボムは毎フレーム位置更新のみ，外観は変化しない

### ハリケーンの描画スキップ (Hurricane Render Skipping)

- 半径の変化が0.0001以下の場合はスプライトサイズの更新をスキップする
- 画面外→画面内の遷移時のみ`renderDisplayFromState()`を実行する

### ボムの重複チェック (Bomb Duplicate Check)

- BombRepositoryが`upsertBomb()`時に`isSameRenderPayload()`で全フィールドを比較する
- 同一ペイロードの場合はオブジェクトの破棄・再生成をスキップする

## ゲームループのステップ分離 (Game Loop Step Architecture)

### ステップ構成 (Step Composition)

GameLoopが毎フレーム以下の4ステップを順に実行する．

1. InputStep: ジョイスティック入力をPlayerControllerに適用する
2. SimulationStep: 自プレイヤーの移動 + リモートプレイヤーの補間 + カリング判定
3. BombStep: ボムの状態更新 + 爆発判定 + カリング適用
4. CameraStep: ワールドコンテナの位置を自プレイヤーに追従させる

### 設計上の利点 (Design Benefits)

- 各ステップが独立しており，個別に最適化できる
- 共有のLoopFrameContext（`deltaSeconds`等）で一貫した時間管理を行う
- LoopFrameEffectsで移動状態をステップ間で受け渡す

## リソース管理 (Resource Management)

### DisposableRegistry

- ゲームシーンのリソース（イベントリスナー，PixiJSオブジェクト等）を登録する
- `disposeAll()`で登録の逆順に破棄し，依存関係のクラッシュを防止する
- シーン遷移時にメモリリークを防止する

### プレイヤーの遅延テクスチャロード (Lazy Player Texture Loading)

- 初期状態では`Texture.WHITE`（1×1ピクセル）で描画を開始する
- 非同期でプレイヤー画像をロードし，完了後にスプライトのテクスチャを差し替える
- ゲーム画面の初期表示をブロックしない

## Bot JITウォームアップ (Bot JIT Warmup)

### 問題 (Problem)

ゲーム開始直後の最初のティックでBot全員の`decide()`が初めて呼ばれると，
V8エンジンのJITコンパイルが集中し，ティック処理時間がスパイクする．

### 解決策 (Solution)

- ゲーム開始前の待機時間（`GAME_START_DELAY_MS`: 5000ms）を利用する
- `warmUp()`メソッドで全Botの`botTurnOrchestrator.decide()`を1回ずつ空実行する
- V8がホットパスを事前にコンパイルし，初回ティックのスパイクを軽減する

### ターゲット初期化の分散 (Distributed Target Initialization)

- 各Botのインデックスに応じて`chooseNextTarget()`の呼び出し回数を分散する
- `chainCount = (botIndex % 4) + 1` で1〜4回の初期化を割り当てる
- 全Botが同一ティックで重い計算を行うことを回避する
