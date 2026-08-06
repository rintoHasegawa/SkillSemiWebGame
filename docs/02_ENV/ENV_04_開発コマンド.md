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

shared パッケージをビルドする（tsup，cjs/esm＋型定義を出力）．

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

自動ユニットテストのスクリプトは未整備である（各 package.json の `test` はスタブ）．現状のテストは `/workspace/test` の負荷テスト（load-bot）のみ．

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
