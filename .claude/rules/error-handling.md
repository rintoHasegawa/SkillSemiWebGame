---
paths: ["apps/client/src/**", "apps/server/src/**", "packages/shared/src/**"]
---

# エラー処理・ログ出力ルール (Error Handling & Logging Rules)

失敗の扱い方とログ出力の方針を定める．client / server / shared のソースを編集するときは必ず本ルールに従うこと．

## エラーの分類 (Error Classification)

| 分類 | 例 | 扱い |
| --- | --- | --- |
| ビジネス上の失敗 | ルーム満員，重複参加，チーム満員 | `status` 付き判別可能ユニオンで返す（例外にしない） |
| 参照解決の失敗 | プレイヤーからルームが引けない | `undefined` または `boolean` で返し，呼び出し側が分岐する |
| 不正入力 | 型不一致のソケットペイロード | 検証で弾いてログを残し，処理せず return する |
| 回復可能な欠損 | アセット読み込み失敗，設定値欠損 | フォールバック（`??`・代替テクスチャ等）で継続する |
| 設定ミス・不変条件違反 | teamId 整合性違反等のプログラマエラー | `throw new Error(...)` で即座に落とす（catch しない） |

**`throw` は「設定ミス・不変条件違反」にのみ使用する．** 実行時に起こり得る失敗（ユーザー操作・ネットワーク起因）を例外で表現しない．

## 層ごとの伝播パターン (Propagation by Layer)

| 層 | パターン |
| --- | --- |
| server: application/useCases・services | `status` 付きユニオンを返す（例: `{ status: "joined" \| "full" \| ... }`）．失敗分岐ごとに `logEvent` する |
| server: network/handlers（オーケストレータ） | `status` を `switch` で分岐し，ログ＋必要なら拒否イベントを emit する |
| server: domains（参照解決） | `undefined` / `boolean` を返す．解決失敗は呼び出し側でログする |
| shared | エラー型を持たない．設定検証（`teamValidators` 等）のみ throw する |
| client: hooks | 明示的な失敗 state で UI に伝える（join フローの `JoinFailureReason` 方式） |
| client: 描画層 | try/catch ＋フォールバック描画で継続する．握り潰す場合も理由コメントを必ず書く |

- 新しい `status` ユニオンを定義するときは，失敗バリアントに不要なフィールドを持たせない（`{ status: "not_found" }` のような厳密な形にする）．
- 判別可能ユニオンの `switch` では全 `status` を処理する（分岐漏れで無言スルーしない．該当処理が無い場合も `logEvent` は行う）．

## クライアントへの失敗通知 (Client Notification)

- 汎用の「エラーイベント」は作らない．拒否理由はイベントごとに `*_REJECTED` イベント＋ `reason` ユニオンで個別定義する（`ROOM_JOIN_REJECTED`・`SELECT_TEAM_REJECTED` 方式．追加時は `.claude/rules/protocol-changes.md` に従う）．
- 高頻度イベント（MOVE 等）の不正入力はクライアントへ通知せず，サーバログのみとする．

## ペイロード検証 (Payload Validation)

- サーバが受信する全イベントのペイロードは `network/validation/socketPayloadValidators.ts` の型ガード（`value is T` 形式）で検証する．
- 検証失敗は**必ず** `payloadGuard` 経由で `ignored_invalid_payload` をログしてから return する（無言破棄を作らない）．

## ログ出力 (Logging)

- サーバのログは `logEvent(scope, payload)`（`@server/logging/logger`）のみを使用する．`console.log` / `console.error` の直書きは禁止する（例外: `index.ts` の起動バナー）．
- スコープ・イベント名・結果値は `logging/constants/` に定数として追加し，`logging/contracts/payloadByScope.ts` に payload 型を登録してから使う（型で組み合わせが検証される）．
- 深刻度はログレベルではなく `result` 値で表現する（`accepted` / `emitted` / `ignored_*` / `rejected_*` の命名に合わせる）．
- クライアントのデバッグログは `ENABLE_DEBUG_LOG`（`import.meta.env.DEV`）でガードする．本番コードパスに素の `console.log` を残さない．クライアントの異常系は `console.error`（`[コンポーネント名]` プレフィックス付き）を使用する．
