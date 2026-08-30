# 研究室サーバデプロイ手順 (Lab Server Deployment Guide)

## 概要 (Overview)

本ドキュメントは，Pixel Paint War を1台の研究室サーバ上に本番デプロイする手順をまとめたものである．
Nginx をリバースプロキシとして使用し，外部公開ポートは 8803 のみとする．
フロントエンド（静的ファイル）とバックエンド（Socket.IO）は同一サーバー内でポートを分けて動作させ，外部デバイスは Nginx 経由でのみ通信する．

### 構成図 (Architecture Diagram)

```text
[デバイス] ──HTTP(8803)──▶ [Nginx (:8803)]
                              ├── /           → 静的ファイル配信（Viteビルド済み）
                              └── /socket.io  → proxy_pass http://127.0.0.1:3000
                                                （サーバ内部のみ，外部非公開）
```

- 外部公開ポート: 8803 のみ
- バックエンド（ポート3000）は localhost バインドで外部アクセス不可
- HTTPS化する場合は Nginx で SSL 終端を行う（「HTTPS化（任意）」参照）

## 前提条件 (Prerequisites)

### サーバー環境 (Server Environment)

- OS: Linux（Ubuntu 20.04 以上推奨）
- Docker / Docker Compose がインストール済みであること
- Nginx がインストール済みであること
- Git がインストール済みであること
- ポート 8803 がファイアウォールで許可されていること

### 確認コマンド (Verification Commands)

```bash
docker --version
docker compose version
nginx -v
git --version
```

## デプロイ手順 (Deployment Steps)

### リポジトリの取得 (Clone Repository)

1. サーバー上で任意のディレクトリにクローンする

   ```bash
   git clone <リポジトリURL> /opt/pixel-paint-war
   cd /opt/pixel-paint-war
   ```

2. デプロイ対象のブランチ・タグに切り替える

   ```bash
   git checkout main
   git pull origin main
   ```

### フロントエンドのビルド (Build Frontend)

フロントエンドは静的ファイルとしてビルドし，Nginx から配信する．
VITE_PROD_SERVER_URL にはデバイスからアクセスする URL を指定する．

#### ローカルネットワーク（HTTP）の場合 (For Local Network via HTTP)

```bash
docker run --rm -v $(pwd):/app -w /app node:26-slim \
    bash -c "npm i -g pnpm@10.28.2 && pnpm install --frozen-lockfile \
    && pnpm --filter @repo/shared build \
    && VITE_PROD_SERVER_URL=http://<サーバIP>:8803 pnpm --filter client build"
```

#### ドメイン運用（HTTPS）の場合 (For Domain via HTTPS)

```bash
docker run --rm -v $(pwd):/app -w /app node:26-slim \
    bash -c "npm i -g pnpm@10.28.2 && pnpm install --frozen-lockfile \
    && pnpm --filter @repo/shared build \
    && VITE_PROD_SERVER_URL=https://yourdomain.example.com:8803 pnpm --filter client build"
```

※ ビルド成果物は apps/client/dist/ に出力される

### バックエンドの起動（Docker Compose） (Start Backend)

本番用の docker-compose.prod.yml を使用してバックエンドを起動する．
ポートは localhost バインドとし，Nginx 経由でのみアクセスさせる．

1. docker-compose.prod.yml を以下の内容に編集する

   ```yaml
   services:
     game-server:
       build:
         context: .
         dockerfile: Dockerfile
       container_name: pixel-paint-server-prod
       restart: unless-stopped
       ports:
         - "127.0.0.1:3000:3000"
       environment:
         - NODE_ENV=production
         - CORS_ORIGIN=http://<サーバIP>:8803
   ```

   ※ ポイント: ports を "127.0.0.1:3000:3000" にすることで，localhost からのみアクセス可能となり外部に直接公開されない

   ※ `CORS_ORIGIN` には**ブラウザがアクセスする URL（Nginx の公開オリジン）**を指定する．本構成ではフロントエンドと Socket.IO を同一の 8803 番ポートで公開しているため，値は `VITE_PROD_SERVER_URL` と同じになる．`<サーバIP>` は実際の IP またはドメインに置き換えること

   ※ **`CORS_ORIGIN` が未設定のままだとサーバーは起動時にエラーで停止する**（設定漏れを検知するための意図的な挙動である）．書式の詳細は [ENV_09_環境変数設定](ENV_09_環境変数設定.md) を参照

   ※ HTTPS 化した場合は `https://yourdomain.example.com:8803` のように，実際にブラウザからアクセスするスキーム・ホスト・ポートに合わせて更新すること

2. コンテナをビルド・起動する

   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

3. 起動確認

   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```

   STATUS が「Up」になっていることを確認する

4. ヘルスチェック

   ```bash
   curl http://127.0.0.1:3000
   ```

   「ok」と返れば正常

### Nginx の設定 (Nginx Configuration)

Nginx の設定ファイルを作成し，ポート 8803 でリクエストを受け付ける．

1. 設定ファイルを作成する

   ```bash
   sudo vi /etc/nginx/sites-available/pixel-paint-war
   ```

2. 以下の内容を記述する

   ```nginx
   server {
       listen 8803;
       server_name _;

       # フロントエンド（静的ファイル配信）
       root /opt/pixel-paint-war/apps/client/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # バックエンド（Socket.IO → 内部ポート3000へプロキシ）
       location /socket.io/ {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. シンボリックリンクを作成して有効化する

   ```bash
   sudo ln -s /etc/nginx/sites-available/pixel-paint-war /etc/nginx/sites-enabled/
   ```

4. 設定の文法チェック

   ```bash
   sudo nginx -t
   ```

   「syntax is ok」「test is successful」と表示されること

5. Nginx を再起動する

   ```bash
   sudo systemctl restart nginx
   ```

### 動作確認 (Verification)

1. ブラウザからアクセスする

   ```text
   http://<サーバIP>:8803
   ```

2. ゲーム画面が表示され，ルーム作成・参加が正常に動作することを確認する

3. バックエンドへの直接アクセスが遮断されていることを確認する

   ```bash
   curl http://<サーバIP>:3000
   ```

   → 接続拒否またはタイムアウトになること

## ファイアウォール設定 (Firewall)

外部に公開するポートを 8803 のみに制限する．

### ufw を使用する場合 (Using ufw)

```bash
sudo ufw allow 8803/tcp
sudo ufw deny 3000/tcp
sudo ufw enable
sudo ufw status
```

### 確認事項 (Checklist)

- ポート 8803: 外部からアクセス可能であること
- ポート 3000: 外部からアクセス不可であること
- SSH ポート（22）: 許可済みであること（ロックアウト防止）

## 運用コマンド (Operations)

### 基本操作 (Basic Operations)

#### バックエンドの状態確認 (Check Backend Status)

```bash
docker compose -f docker-compose.prod.yml ps
```

#### ログ確認（リアルタイム） (View Logs in Real Time)

```bash
docker compose -f docker-compose.prod.yml logs -f
```

#### バックエンドの停止 (Stop Backend)

```bash
docker compose -f docker-compose.prod.yml down
```

#### バックエンドの再起動 (Restart Backend)

```bash
docker compose -f docker-compose.prod.yml restart
```

#### Nginx の状態確認 (Check Nginx Status)

```bash
sudo systemctl status nginx
```

### アップデート手順 (Update Procedure)

コードを更新して再デプロイする場合の手順．

1. 最新コードを取得する

   ```bash
   cd /opt/pixel-paint-war
   git pull origin main
   ```

2. フロントエンドを再ビルドする（「フロントエンドのビルド」の手順を再実行）

3. バックエンドを再ビルド・再起動する

   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

4. Nginx を再読み込みする（設定変更がある場合のみ）

   ```bash
   sudo systemctl reload nginx
   ```

### キャッシュクリア再ビルド (Rebuild Without Cache)

ビルドキャッシュが原因で問題が発生する場合に実行する．

```bash
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d --force-recreate
```

## HTTPS化（任意） (HTTPS Setup)

ドメインを使用して HTTPS でアクセスさせる場合の追加手順．

### Let's Encrypt で証明書を取得する (Obtain Certificate via Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.example.com
```

### Nginx 設定を HTTPS 対応に変更する (Update Nginx Configuration for HTTPS)

```nginx
server {
    listen 8803 ssl;
    server_name yourdomain.example.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.example.com/privkey.pem;

    root /opt/pixel-paint-war/apps/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 証明書の自動更新を確認する (Verify Automatic Certificate Renewal)

```bash
sudo certbot renew --dry-run
```

## トラブルシューティング (Troubleshooting)

### ブラウザでゲーム画面が表示されない (Game Screen Not Displayed in Browser)

- Nginx のエラーログを確認する

  ```bash
  sudo tail -50 /var/log/nginx/error.log
  ```

- 静的ファイルのパスが正しいか確認する

  ```bash
  ls /opt/pixel-paint-war/apps/client/dist/index.html
  ```

### Socket.IO 接続がエラーになる (Socket.IO Connection Errors)

- バックエンドコンテナが起動しているか確認する

  ```bash
  docker compose -f docker-compose.prod.yml ps
  ```

- ローカルからバックエンドに疎通できるか確認する

  ```bash
  curl http://127.0.0.1:3000
  ```

- Nginx のプロキシ設定で WebSocket ヘッダーが正しいか確認する

- CORS で拒否されていないか確認する

  ```bash
  docker compose -f docker-compose.prod.yml logs | grep rejected_origin
  ```

  `rejected_origin` が記録されている場合は，`docker-compose.prod.yml` の `CORS_ORIGIN` の値がブラウザのアクセス URL（`http://<サーバIP>:8803`）と一致していない．値を修正してコンテナを再起動する

### ポート 8803 にアクセスできない (Cannot Access Port 8803)

- ファイアウォールでポート 8803 が許可されているか確認する

  ```bash
  sudo ufw status
  ```

- Nginx がポート 8803 で listen しているか確認する

  ```bash
  sudo ss -tlnp | grep 8803
  ```
