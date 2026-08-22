# 開発コマンド (Development Commands)

日常の開発で使用するコマンドの一覧である．コマンドの推測を避けるため，起動・ビルド・テスト・lint はまず本ファイルを参照すること．
詳細な手順は各リンク先ドキュメントに委譲する．

## 起動 (Startup)

### 開発環境 (Dev Containers)

開発環境は VS Code の Dev Containers で起動する（「Reopen in Container」を実行）．操作の詳細は [ENV_05_Docker運用操作ガイド](ENV_05_Docker運用操作ガイド.md) を参照．

コンテナ内での開発サーバ起動は以下を使用する．

```bash
pnpm --filter client dev
```

クライアントの開発サーバ（Vite，`--host` 付き）を起動する．

```bash
pnpm --filter server dev
```

サーバを watch モード（tsx watch）で起動する．

### 本番環境 (Docker Compose)

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

本番用コンテナをビルドして起動する（接続確認は `http://localhost:3001`）．停止・ログ確認・トラブルシューティングは [ENV_05_Docker運用操作ガイド](ENV_05_Docker運用操作ガイド.md) を参照．

## ビルド (Build)

```bash
pnpm --filter @repo/shared build
```

shared パッケージをビルドする（tsup で cjs/esm を出力し，続けて `tsc -p tsconfig.build.json` で型定義（`.d.ts`）を出力する．型定義を tsup の `--dts` で生成しないのは，tsup が `baseUrl` を自前で注入し TypeScript 6 で非推奨エラーになるため）．

```bash
pnpm --filter server build
```

サーバをビルドする（tsc＋tsc-alias）．

```bash
pnpm --filter client build
```

クライアントをビルドする（tsc＋vite build）．

※ shared は client/server から参照されるため，先に shared をビルドすること．

```bash
pnpm --filter server start
```

ビルド済みサーバ（`dist/index.js`）を起動する．

```bash
pnpm --filter client preview
```

クライアントのビルド成果物をローカルでプレビューする．

## テスト (Test)

### ユニットテスト (Unit Test)

shared・server・client のユニットテストは Vitest で実行する（テストファイルは `src` 配下に `*.test.ts` として同居）．

```bash
pnpm --filter @repo/shared test
```

shared のユニットテストを実行する（`vitest run`）．

```bash
pnpm --filter server test
```

サーバのユニットテストを実行する（`vitest run`）．

```bash
pnpm --filter client test
```

クライアントのユニットテストを実行する（`vitest run`）．

```bash
pnpm -r test
```

全パッケージのユニットテストをまとめて実行する．

### 負荷テスト (Load Test)

```bash
cd /workspace/test && pnpm install
```

負荷テスト用の依存関係をインストールする（初回のみ．test 配下は独立した依存関係を持つ）．

```bash
pnpm start
```

負荷テストBotを実行する（`/workspace/test` 内で実行．開発環境接続は `pnpm start -- --dev`）．接続先・パラメータの詳細は [ENV_06_テスト操作手順](ENV_06_テスト操作手順.md) を参照．

## リント (Lint)

```bash
pnpm --filter client lint
```

クライアントの ESLint を実行する（`src` 配下の `.ts` / `.tsx`）．

```bash
pnpm --filter server lint
```

サーバの ESLint を実行する（`src` 配下の `.ts`）．

```bash
pnpm --filter @repo/shared lint
```

shared の ESLint を実行する（`src` 配下の `.ts`）．

```bash
pnpm --filter @repo/shared lint:fix
```

shared の ESLint を自動修正付きで実行する．

## その他 (Miscellaneous)

ルートの `/workspace/package.json` に定義されたコマンド．

```bash
pnpm shared:prune
```

shared パッケージの未使用エクスポートを検出する（ts-prune，allowlist 適用）．

```bash
pnpm shared:prune:check
```

同上を検出時に失敗扱い（`--fail-on-findings`）で実行する．
