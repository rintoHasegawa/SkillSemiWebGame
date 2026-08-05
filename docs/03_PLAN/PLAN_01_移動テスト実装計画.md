# Pixel Paint War - プロトタイプ実装計画 (Prototype Implementation Plan)

## 概要 (Overview)

本ドキュメントは，50人同時接続テスト（旧「SPEC_03_プロトタイプ_移動テスト」で定義．現在は廃止され，負荷テストの仕様は [TEST_01_負荷テスト仕様.md](../06_TEST/TEST_01_負荷テスト仕様.md) に引き継がれている）を達成するための段階的な実装ロードマップである．
複雑性を排除するため，最小構成から機能を積み上げる（Step-by-Step）方式を採用する．

## 実装フェーズ定義 (Implementation Phases)

### Step 1: クライアント単体移動 (Local Movement)

#### 目標 (Goal)

サーバーを介さず，ブラウザ上でジョイスティック操作によりキャラクターが移動・描画されること．

#### 実装対象 (Implementation Targets)

- `packages/shared/`
  - `src/config/gameConfig.ts`: マップサイズ，移動速度等の定数定義．
  - `src/utils/math.ts`: ベクトル計算，移動ロジック (`Pos += Vel * Speed * DT`)．
- `apps/client/`
  - `src/input/Joystick.ts`: タッチ入力の正規化，デッドゾーン処理．
  - `src/entities/PlayerSprite.ts`: 描画更新処理．
  - `src/core/GameLoop.ts`: Pixi.js Tickerを用いたメインループ．

### Step 2: サーバー開通・単体通信 (Single Player Network)

#### 目標 (Goal)

WebSocketサーバーと接続し，バイナリパケットの送受信（エコーテスト）に成功すること．

#### 実装対象 (Implementation Targets)

- `packages/shared/`
  - `src/protocol/schema.ts`: DataViewを用いたバイナリエンコード/デコード処理．
- `apps/server/`
  - `src/index.ts`: WebSocketサーバー起動 (wsライブラリ)．
  - `src/network/Connection.ts`: 接続管理．
- `apps/client/`
  - `src/network/SocketClient.ts`: バイナリ送受信の実装．

### Step 3: 複数人同期・補間 (Multiplayer Sync)

#### 目標 (Goal)

2つのクライアント間で位置同期が行われ，他プレイヤーの動きが補間により滑らかに表示されること．

#### 実装対象 (Implementation Targets)

- `apps/server/`
  - `src/managers/RoomManager.ts`: 接続IDと座標の管理．
  - `src/network/PacketHandler.ts`: 全員分の座標スナップショット作成とブロードキャスト．
- `apps/client/`
  - `src/entities/RemotePlayer.ts`: 他プレイヤー描画クラス．
  - `src/network/Reconciler.ts`: 線形補間 (Lerp) ロジックの実装．

### Step 4: 50人規模最適化 (Optimization & Scaling)

#### 目標 (Goal)

パケットサイズを削減し，50人同時動作時の帯域負荷を仕様内（30KB/s以下）に抑えること．

#### 実装対象 (Implementation Targets)

- `packages/shared/`
  - `src/utils/quantization.ts`: 座標の圧縮 (Float -> Uint16)．
- `apps/server/`
  - `src/core/ServerEngine.ts`: ループ処理の最適化，必要に応じたAoI（関心領域）判定．

### Step 5: メタデータ・UI実装 (Meta Data & UI)

#### 目標 (Goal)

ゲーム開始前のロビー画面およびUIを実装し，ゲームサイクルを完成させること．

#### 実装対象 (Implementation Targets)

- `apps/client/`
  - `src/scenes/TitleScene.ts`: 名前入力とスタート処理．
  - `src/ui/UIManager.ts`: DOMベースのUIオーバーレイ．
- `packages/shared/`
  - `src/types/index.ts`: ロビー用JSONメッセージの型定義．

## 開発ルール (Development Rules)

- ロジックの共通化: 移動計算式や衝突判定は必ず `packages/shared` に実装し，Client/Server間でコードを共有する．
- 検証優先: 各Step完了ごとに動作確認を行い，バグを次工程に持ち越さない．
