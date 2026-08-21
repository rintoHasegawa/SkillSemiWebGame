---
paths: ["**/*.test.*", "test/**"]
---

# テスト方針 (Testing Rules)

テストの種類・粒度・配置・実行タイミングを定める．テストの作成・編集時は必ず本ルールに従うこと．

※ 現状ユニットテストは未整備である（`test` スクリプトはスタブ）．本ルールは今後テストを整備する際の標準を定める．

## テストフレームワーク (Framework)

- **Vitest を標準とする**（Vite エコシステムと同一設定で動作し，TypeScript / ESM / pnpm workspace に対応するため）．
- 未導入のパッケージへは，テストを初めて書く時点で devDependency として追加し，`"test": "vitest run"` を scripts に設定する（`echo Error` のスタブを置き換える）．コマンド確定時は `docs/02_ENV/ENV_04_開発コマンド.md` に反映する．

## テストの種類と優先順位 (Test Types & Priority)

| 種類 | 対象 | 優先度 |
| --- | --- | --- |
| ユニットテスト | `packages/shared/src/domains/`（移動計算・gridMap・bombHit・aoi・tick 等の純ロジック） | 最優先（同期ズレ防止の要のため） |
| ユニットテスト | `apps/server` の useCases・services（`status` ユニオンの全分岐） | 高 |
| ユニットテスト | `apps/client` の hooks・純ロジック | 必要に応じて |
| 負荷テスト | `test/` の load-bot（`docs/06_TEST/TEST_01_負荷テスト仕様.md` 準拠） | 別枠（ユニットテストと混在させない） |

- UI 描画（Pixi.js / React コンポーネント）の自動テストは当面対象外とする（Phase 1 の人間による動作確認で担保する．GUIDE_02）．

## 配置規則 (File Placement)

- テストファイルは対象ファイルと同じディレクトリに `<対象ファイル名>.test.ts` として同居させる（例: `gridMap.ts` → `gridMap.test.ts`）．
- 複数のテストで共有するフィクスチャ（`createRoom`・`createPlayerData` 等）は，各パッケージの `src/testing/` に集約する（例: `apps/server/src/testing/`）．テスト専用であり，本番コードからの import は禁止する（ビルド対象からも除外する）．
- 負荷テスト関連は従来どおり `/test` 配下に置く．

## 粒度・書き方 (Granularity & Style)

- 1 テストファイル = 1 対象モジュールとする．
- `describe` は対象の関数・クラス名，`it` は日本語で「〜すること」の形で振る舞いを書く．
- 1 つの `it` では 1 つの振る舞いのみ検証する．
- 境界値（0・上限・座標クランプ等）と `status` ユニオンの失敗分岐を必ず含める．

## モック方針 (Mocking Policy)

- `packages/shared` の純ロジックはモックなしでテストする（モックが必要になったら設計を疑う）．
- `apps/server` は ports（`application/ports/`）境界でスタブを注入する．Socket.IO の実接続はユニットテストでは行わない．
- `vi.mock` によるモジュール差し替えは最終手段とし，依存注入で代替できる場合はそちらを使う．

## 実行タイミング (When to Run)

- `/implement` の Phase 2 で tester エージェントが作成・実行する（GUIDE_02）．
- コミット・PR 前に全テストが緑であること（GUIDE_03「CI 構築までの暫定ゲート」）．
- カバレッジの数値基準は設けない．「新規・変更したロジックにテストが付いていること」を基準とする．
