# 環境変数設定 (Environment Variables)

## 概要 (Overview)

### 目的 (Purpose)

本ドキュメントは，Pixel Paint War のビルド・実行時に必要な環境変数の一覧と設定方法を記す．
デプロイ先ごとの固有手順は各デプロイ手順書を参照すること．

- Render へのデプロイ: [ENV_10_Renderデプロイ手順](ENV_10_Renderデプロイ手順.md)
- 研究室サーバへのデプロイ: [ENV_11_研究室サーバデプロイ手順](ENV_11_研究室サーバデプロイ手順.md)

## クライアント環境変数（Vite） (Client Environment Variables)

### 変数一覧 (Variable List)

#### VITE_PROD_SERVER_URL

- 用途: 本番環境でクライアントが接続するサーバーの URL
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

## サーバー環境変数 (Server Environment Variables)

### 変数一覧 (Variable List)

#### NODE_ENV

- 用途: 実行環境の識別
- 値: production（本番）/ development（開発）
- 設定箇所: docker-compose.prod.yml の environment セクション
- 注意事項: リポジトリルートの `Dockerfile` が `ENV NODE_ENV=production` を焼き込んでいるため，Docker イメージから起動した場合は常に本番モードとなる．ローカルで `docker compose -f docker-compose.prod.yml` を使う場合も後述の CORS_ORIGIN の設定が必要である

#### PORT

- 用途: サーバー（HTTP / Socket.IO）が待ち受けるポート番号
- 参照箇所: apps/server/src/index.ts の PORT（`httpServer.listen` に渡す）
- 設定箇所: リポジトリルートの `Dockerfile` が `ENV PORT=3000` を焼き込んでいる
- 未設定時の挙動: apps/server/src/config/index.ts の `NETWORK_CONFIG.DEV_SERVER_PORT`（3000）を使用する
- 注意事項:
  - `Dockerfile` は同じ 3000 番を `EXPOSE` しているため，Docker イメージから起動した場合の待受ポートは 3000 である
  - `docker-compose.prod.yml` はコンテナの 3000 番をホストの 3001 番へ公開する．ホスト側の公開ポートを変えたい場合は PORT ではなく ports のマッピングを変更する

#### CORS_ORIGIN

- 用途: Socket.IO サーバーが接続を許可するブラウザのオリジン（クライアントの配信元 URL）を指定する
- 参照箇所: apps/server/src/network/bootstrap/corsPolicy.ts で解決し，同 createIo.ts の CORS 判定に使用する
- 設定箇所: Render では server サービスの Environment，研究室サーバでは docker-compose.prod.yml の environment セクション
  - リポジトリの `docker-compose.prod.yml` にはローカルでの本番確認用の既定値 `http://localhost:5173` を記載している．デプロイ先では実際の配信元オリジンに置き換えること
- 書式: 許可するオリジンをカンマ区切りで列挙する．スキーム（http / https）とホスト，既定以外のポートまでを含めた**オリジン**を指定し，パスは含めない

  ```text
  CORS_ORIGIN=https://pixel-paint-war-client.onrender.com
  ```

  複数のオリジンを許可する場合の例を以下に示す．

  ```text
  CORS_ORIGIN=https://pixel-paint-war-client.onrender.com,http://192.168.0.10:8803
  ```

- 正規化: 各要素は前後の空白除去・末尾スラッシュ除去・小文字化を行ったうえで比較する．`https://example.com/` と `https://example.com` は同一として扱う
- 未設定時の挙動:
  - `NODE_ENV=production` の場合: **サーバーは起動時にエラーを投げて停止する**．設定漏れを無言で見逃さないための意図的な挙動である
  - `NODE_ENV` が production 以外（開発時）の場合: すべてのオリジンを許可する（従来どおりの開発体験を維持する）
- 注意事項:
  - 指定するのは**クライアントを配信しているオリジン**であり，サーバー自身の URL ではない．VITE_PROD_SERVER_URL と取り違えないこと
  - Origin ヘッダを持たない接続（負荷テスト Bot・curl 等の非ブラウザクライアント）は本番でも許可する．ブラウザは必ず Origin を送るため，第三者ページからの接続がこの許可を悪用することはできない
  - 許可外のオリジンからの接続は拒否され，サーバーログに `[Network]` スコープの `rejected_origin` として記録される．接続できない場合はまずこのログを確認する
