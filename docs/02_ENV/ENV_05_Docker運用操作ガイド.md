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

※ 認証情報（GitHub CLI / Claude Code）はボリュームに永続化されているため，Rebuild しても再ログインは不要である（次節参照）．

### 認証情報の永続化 (Auth Persistence)

GitHub CLI と Claude Code の認証情報・CLI 本体は Docker の名前付きボリュームに保存され，コンテナを Rebuild しても消えない．

| ボリューム名 | マウント先 | 内容 |
| --- | --- | --- |
| `claude-config` | `/home/node/.claude` | Claude Code の認証・設定・セッション履歴 |
| `gh-config` | `/home/node/.config/gh` | GitHub CLI の認証 |
| `claude-local` | `/home/node/.local` | Claude Code CLI 本体（`bin/claude` と `share/claude/versions/`） |

- 環境変数 `CLAUDE_CONFIG_DIR=/home/node/.claude` により，Claude Code の設定ファイル一式がボリューム内に配置される（`docker-compose.yml` で定義）．
- コンテナ作成時に `.devcontainer/postcreate.sh` が以下を自動実行する:
  - ボリュームの所有権を `node` ユーザーに修正
  - `.devcontainer/.auth-seed/` に退避された認証情報があれば，ボリュームが空のときのみ復元
  - `claude` コマンドが見つからない場合は公式インストールスクリプトで自動インストール
  - `gh` 認証済みの場合は `gh auth setup-git` を実行（git push/pull で gh の認証を使用）
  - `pnpm -v` が `package.json` の `packageManager` の版と異なる場合は `npm i -g pnpm@<版>` で強制的に揃える
  - `pnpm install` と `pnpm --filter @repo/shared build` を実行し，依存の導入と shared のビルドまで済ませる
- `.devcontainer/.auth-seed/` は gitignore 済みの一時退避場所である．ボリュームへの復元が済んだら削除してよい．

#### 注意点 (Cautions)

- `docker volume rm claude-config gh-config claude-local` や `docker volume prune` を実行すると認証情報や CLI 本体が消え，`gh auth login` と Claude Code のログインを再度行う必要がある（CLI 本体は次回の Rebuild 時に自動で再インストールされる）．
- ボリュームは初回ログイン後に自動的に内容が保存されるため，日常的な操作は不要である．

## 本番環境 (Production Environment)

手動で Docker Compose コマンドを実行する．
※ WSL (Windows) または ホストOSのターミナルで実行する．Dev Container 内からも実行できる（`devcontainer.json` の `docker-outside-of-docker` feature と `docker-compose.yml` の `/var/run/docker.sock` → `/var/run/docker-host.sock` マウントにより，コンテナ内の `docker` CLI がホストの Docker Desktop を操作する．イメージ・コンテナはホスト側に作られ，ポートもホスト側で開く）．Claude Code に本番イメージのビルド検証を依頼する場合はこの経路で行う．

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
