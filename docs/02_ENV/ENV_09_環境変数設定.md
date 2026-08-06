# 環境変数設定 (Environment Variables)

## 概要 (Overview)

### 目的 (Purpose)

本ドキュメントは，Pixel Paint War のビルド・実行時に必要な環境変数の一覧と設定方法を記す．
デプロイ先ごとの固有手順は各デプロイ手順書を参照すること．

- Render へのデプロイ: ENV_10_Renderデプロイ手順.md
- 研究室サーバへのデプロイ: ENV_11_研究室サーバデプロイ手順.md

## クライアント環境変数（Vite） (Client Environment Variables)

### 変数一覧 (Variable List)

#### VITE_PROD_SERVER_URL

- 用途: 本番環境でクライアントが接続するサーバの URL
- 参照箇所: apps/client/src/config/index.ts の PROD_SERVER_URL
- 設定タイミング: Vite ビルド時に静的ファイルへ埋め込まれる
- 注意事項:
  - VITE_* の値はブラウザから参照可能なため，秘密情報は設定しないこと
  - 値を変更した場合は再ビルド・再デプロイが必要

### ローカル開発での設定例 (Local Development Example)

開発時は以下のファイルに記述する．

ファイル: `apps/client/.env.development`

```text
VITE_PROD_SERVER_URL=http://localhost:3000
```

※ .env.development は .gitignore に含めること

## サーバ環境変数 (Server Environment Variables)

### 変数一覧 (Variable List)

#### NODE_ENV

- 用途: 実行環境の識別
- 値: production（本番）/ development（開発）
- 設定箇所: docker-compose.prod.yml の environment セクション
