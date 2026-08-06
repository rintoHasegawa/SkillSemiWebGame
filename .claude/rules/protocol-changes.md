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

## 変更時のチェックポイント (Checklist)

PR 前に以下を確認する．

- [ ] イベント名追加済みか
- [ ] payload 型追加済みか
- [ ] map への方向別登録済みか
- [ ] `events.ts` 再公開が過不足ないか
- [ ] client/server で型エラーがないか
- [ ] 既存イベントの型互換を壊していないか
- [ ] player 座標差分イベント（`SocketEvents.UPDATE_PLAYERS` / `update-players`）に `teamId` を含めていないか
- [ ] 初期同期イベント（`SocketEvents.CURRENT_PLAYERS` / `current-players`，`SocketEvents.NEW_PLAYER` / `new-player`）に `teamId` を含めているか

## 典型ミスと対策 (Common Pitfalls)

### イベント名だけ追加して map を更新しない

- 症状: emit/on の型推論が崩れる，もしくは any 化する．
- 対策: 手順 3（方向別マップへの追加）を必須工程として実施する．

### payload 定義場所が不適切

- 症状: common/lobby/game の境界が曖昧になる．
- 対策: イベント責務に従って `payloads/` 配下へ配置する．

### 循環参照を作る

- 症状: 型解決エラー，TS2307/TS2456 系が発生しやすくなる．
- 対策: `events.ts` は再公開専用とし，型本体は payload 側へ置く．

## 検証コマンド (Validation Commands)

```bash
pnpm --filter @repo/shared build
pnpm --filter server build
pnpm --filter client build
```

## 運用ルール (Operation Rules)

- プロトコル追加時は，本ガイドの標準追加フロー 1〜5 を PR 上でチェックする．
- `events.ts` に型本体を戻さない（再公開専用を維持する）．
- 新規型のコメントは [coding-style](coding-style.md) ルールに従う．
