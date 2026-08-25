---
paths: ["packages/shared/src/protocol/**"]
---

# プロトコル追加手順 (Protocol Extension Guide)

ソケットイベントの追加・変更時に，修正箇所の漏れを防ぐための標準手順を定義する．`packages/shared/src/protocol` の責務分割方針に従い，イベント名，ペイロード型，方向別マップ，公開エントリを順に更新すること．

## 適用対象 (Scope)

- 対象レイヤ: shared プロトコル定義（client/server 共通契約）
- 対象ディレクトリ: `packages/shared/src/protocol`
- 対象ユースケース: 新規イベント追加，既存イベントのペイロード変更，イベント廃止

## ディレクトリ構成 (Directory Layout)

基準構成は以下とする．

```text
packages/shared/src/protocol/
├── socketEvents.ts
├── eventPayloads.ts
├── eventPayloadMaps.ts
├── events.ts
├── socketEventBridge.ts
├── payloads/
│   ├── commonPayloads.ts
│   ├── lobbyPayloads.ts
│   └── gamePayloads.ts
└── maps/
    ├── commonEventPayloadMap.ts
    ├── lobbyEventPayloadMap.ts
    └── gameEventPayloadMap.ts
```

## 標準追加フロー (Standard Flow)

新規イベントを追加する場合は，必ず次の順で全工程を実施する．

1. **イベント名を追加する**
   - ファイル: `socketEvents.ts`
   - 作業: `SocketEvents` にイベント名を追加する．
   - 確認: 命名規則（kebab-case / snake_case）を既存方針に合わせる．
2. **ペイロード型を追加する**
   - ファイル: `payloads/commonPayloads.ts` または `payloads/lobbyPayloads.ts` または `payloads/gamePayloads.ts`
   - 作業: イベントに対応する payload 型を追加する．
   - 確認: 既存型の再利用可否を確認し，重複定義を避ける．
3. **方向別マップへ対応を追加する**
   - ファイル: `maps/commonEventPayloadMap.ts` / `maps/lobbyEventPayloadMap.ts` / `maps/gameEventPayloadMap.ts`
   - 作業: 追加イベントを C→S または S→C の適切な map に追記する．
   - 確認: 方向が誤っていないかを必ず確認する．
4. **集約エントリの再公開を調整する**
   - ファイル: `eventPayloads.ts` / `eventPayloadMaps.ts` / `events.ts`
   - 作業: 外部利用が必要な型のみ再公開する．
   - 確認: 既存 import パス互換（`@repo/shared` 経由）を維持する．
5. **利用側を接続する**
   - 対象: client/server の handler / bridge / useCase
   - 作業: on/off/emit と payload 型参照を更新する．

## 互換性を壊す変更と PROTOCOL_VERSION (Breaking Changes and PROTOCOL_VERSION)

ペイロード形状の変更・イベント廃止など，client/server の契約を壊す変更を入れたときは `packages/shared/src/protocol/protocolVersion.ts` の `PROTOCOL_VERSION` を 1 つ上げる．

### なぜ必要か (Why)

クライアントは PWA として Service Worker にキャッシュされるため，サーバをデプロイしても**旧クライアントが端末に残り続ける**．版を上げないと旧バンドルが新サーバへ接続し，形の合わないペイロードを受け取って無言のまま固まる（2026-08-25 の本番デプロイで発生．#355）．版を上げておけば，接続時点で拒否されて原因が特定できる状態になる．

### 照合の仕組み (How It Works)

- クライアントはハンドシェイクの `auth.protocolVersion` に `PROTOCOL_VERSION` を載せる（`apps/client/src/network/SocketManager.ts`）
- サーバは接続ミドルウェア `createProtocolVersionGuard`（`apps/server/src/network/bootstrap/protocolVersionGuard.ts`）で照合し，不一致なら `PROTOCOL_VERSION_MISMATCH_ERROR`（`protocol-version-mismatch`）を渡して接続を拒否する
- 拒否は `rejected_protocol_version` としてサーバログに残るため，デプロイ後の切り分けに使える
- クライアントは `connect_error` を購読して版不一致を検出する（`apps/client/src/network/handlers/CommonHandler.ts`）

### デプロイ直後の初回起動 (First Launch After Deploy)

Service Worker は新しい版を取得しても即座には適用されない．更新の適用はタイトル画面に戻ったときのゲートで行われるため，**デプロイ直後の 1 回目の起動は旧バンドルのまま動きうる**．版を上げた直後のデプロイでは，この 1 回目の起動が接続拒否になり参加要求がタイムアウトする（2 回目の起動で解消する）．これは障害ではなく想定された一度きりの劣化であり，[ENV_10_Renderデプロイ手順](../../docs/02_ENV/ENV_10_Renderデプロイ手順.md) にも記載がある．

### 自動化されていないこと (Not Automated)

※ **`PROTOCOL_VERSION` の上げ忘れを検出する仕組みは無く，人間の注意にしか守られていない**．ペイロード型だけを変えても型チェックもユニットテストも通ってしまうため，本ルールのチェックリストで人が確認するしかない．

将来の選択肢としてのメモ（**今回は実装しない**）: `packages/shared/src/protocol` 配下の内容ハッシュから `PROTOCOL_VERSION` を自動生成すれば，protocol ディレクトリに差分がある限り版が必ず変わり，上げ忘れが構造的に起きなくなる．ただし整形やコメント修正だけでも版が変わり，互換性を壊さない変更でも全クライアントが再接続を強いられる．採用する場合はハッシュ対象を型定義の正規化結果に絞る等の検討が要る．

## 変更時のチェックポイント (Checklist)

PR 前に以下を確認する．

- [ ] イベント名追加済みか
- [ ] payload 型追加済みか
- [ ] map への方向別登録済みか
- [ ] `events.ts` 再公開が過不足ないか
- [ ] client/server で型エラーがないか
- [ ] 既存イベントの型互換を壊していないか
- [ ] 互換性を壊す変更（ペイロード形状の変更・イベント廃止）なら `PROTOCOL_VERSION` を上げたか
- [ ] player 座標差分イベント（`SocketEvents.UPDATE_PLAYERS` / `update-players`）に `teamId` を含めていないか
- [ ] 初期同期イベント（`SocketEvents.CURRENT_PLAYERS` / `current-players`，`SocketEvents.NEW_PLAYER` / `new-player`）に `teamId` を含めているか

## 典型ミスと対策 (Common Pitfalls)

### イベント名だけ追加して map を更新しない

- 症状: emit/on の型推論が崩れる，もしくは any 化する．
- 対策: 手順 3（方向別マップへの追加）を必須工程として実施する．

### payload 定義場所が不適切

- 症状: common/lobby/game の境界が曖昧になる．
- 対策: イベント責務に従って `payloads/` 配下へ配置する．

### `PROTOCOL_VERSION` を上げずにペイロードを変える

- 症状: PWA キャッシュに残った旧クライアントが新サーバへ接続し，画面が無言で固まる．
- 対策: [互換性を壊す変更と PROTOCOL_VERSION](#互換性を壊す変更と-protocol_version-breaking-changes-and-protocol_version) に従い版を上げる．検出は自動化されていないため，チェックリストで必ず確認する．

### 循環参照を作る

- 症状: 型解決エラー，TS2307/TS2456 系が発生しやすくなる．
- 対策: `events.ts` は再公開専用とし，型本体は payload 側へ置く．

## 検証コマンド (Validation Commands)

```bash
pnpm verify
```

ワークスペース全体（shared・server・client・負荷テスト Bot）の型チェックとユニットテストを実行する．**プロトコル変更時は必ず本コマンドで検証する**．型チェックだけを回す場合は `pnpm typecheck` を使う．

※ 負荷テスト Bot は client/server のビルド対象に含まれないため，build だけでは #355 のようなプロトコル変更による破壊を見逃す（型チェック基盤は #357 で整備済み）．

```bash
pnpm --filter @repo/shared build
pnpm --filter server build
pnpm --filter client build
```

配布物の生成まで確認する場合に実行する（shared を先にビルドすること．詳細は [ENV_04_開発コマンド](../../docs/02_ENV/ENV_04_開発コマンド.md)）．

## 運用ルール (Operation Rules)

- プロトコル追加時は，本ガイドの標準追加フロー 1〜5 を PR 上でチェックする．
- 互換性を壊す変更（ペイロード形状の変更・イベント廃止）では `PROTOCOL_VERSION` を上げ，PR 上でチェックする．
- `events.ts` に型本体を戻さない（再公開専用を維持する）．
- 新規型のコメントは [coding-style](coding-style.md) ルールに従う．
