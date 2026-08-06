# Docker 運用・操作ガイド (Docker Operations Guide)

## 目的 (Objective)

本ドキュメントは，Pixel Paint War プロジェクトにおける Docker の日常的な操作コマンドと，トラブルシューティング手順をまとめたものである．
本プロジェクトでは「開発環境」と「本番環境」で異なる運用を行う．

## 開発環境 (Development Environment)

VS Code の Dev Containers 機能を使用する．

### 基本操作

- 起動: VS Code でプロジェクトを開き，「Reopen in Container」を実行する．
- 停止: VS Code を閉じる（自動的に停止する）．
- ターミナル: VS Code 内のターミナルを使用する．

### コンテナの再構築 (Rebuild)

依存関係の不整合や設定変更が反映されない場合に実行する．

1. コマンドパレット (F1) を開く．
2. 「Dev Containers: Rebuild Container」を選択する．
3. キャッシュを無視したい場合は「Rebuild Without Cache」を選択する．

## 本番環境 (Production Environment)

手動で Docker Compose コマンドを実行する．
※ 必ず WSL (Windows) または ホストOSのターミナルで実行すること．

### 基本コマンド

#### 起動 (ビルド込み)

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

#### 状態確認

```bash
docker compose -f docker-compose.prod.yml ps
```

#### ログ確認 (リアルタイム)

```bash
docker compose -f docker-compose.prod.yml logs -f
```

#### 停止

```bash
docker compose -f docker-compose.prod.yml down
```

### ポート仕様

- ホスト側ポート: 3001
- コンテナ内ポート: 3000
- 接続確認URL: `http://localhost:3001`

※ 開発用コンテナ (Port 3000) との衝突を避けるため，3001番を使用する．

## トラブルシューティング (Troubleshooting)

### ビルドエラー・反映漏れへの対処

修正したコードが反映されない，または原因不明のエラーが出る場合，キャッシュを使わずに強制的に再ビルドを行う．

```bash
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d --force-recreate
```

### モジュールが見つからない (MODULE_NOT_FOUND)

本番起動時に `ws` 等が見つからないエラーが出る場合，`Dockerfile` の COPY記述を確認する．pnpm のシンボリックリンク構造に対応するため，以下が記述されている必要がある．

```dockerfile
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules
```

### 再起動ループ (Restarting)

`docker ps` でステータスが `Restarting` になる場合，サーバープロセスがクラッシュまたは終了している．

1. ログを確認する:

   ```bash
   docker compose -f docker-compose.prod.yml logs --tail=50
   ```

2. コード修正後，「ビルドエラー・反映漏れへの対処」の手順で再デプロイする．
