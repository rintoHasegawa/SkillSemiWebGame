# 管理者用環境構築手順 (Admin Setup Guide)

## はじめに (Introduction)

本ドキュメントは，プロジェクトを「ゼロから新規作成・再構築する管理者」向けのMonorepo構成およびDocker環境の構築ログである．

※ 一般の開発メンバー（Git Cloneして参加する人）は本ドキュメントを実施不要である．

※ **注意**: 本ドキュメントは立ち上げ時点の構築ログであり，その後の実装で構成が変わっている（例: server の通信ライブラリは ws → Socket.IO に変更済み，client は Preact テンプレートから React 18 + @pixi/react に移行済み）．手順をそのまま実行しても現在の構成は再現されない．現在の構成は [ENV_01_技術スタック.md](ENV_01_技術スタック.md) を参照すること．

## 管理者用事前準備 (Prerequisites for Admin)

### プロジェクト作成用ツールのインストール (Install Project Tools)

1. Node.js (v20.x LTS)

   - Nodesource リポジトリを使用してインストールする．

     ```bash
     # リポジトリのセットアップとインストール
     curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
     sudo apt-get install -y nodejs
     ```

   - 確認コマンド:

     ```bash
     node -v  # v20.x.x と表示されること
     ```

2. pnpm (Package Manager)

   - Node.js 標準の npm ではなく pnpm を使用する．
   - Corepack (Node.js同梱) を有効化してインストールする．

     ```bash
     sudo corepack enable
     corepack prepare pnpm@latest --activate
     ```

   - 確認コマンド:

     ```bash
     pnpm -v
     ```

## 新規プロジェクト構築 (Project Initialization)

### プロジェクト初期化 (Initialize Project)

1. ディレクトリ作成

   ```bash
   mkdir SkillSemiWebGame
   cd SkillSemiWebGame
   ```

2. Git/pnpm 初期化

   ```bash
   git init
   pnpm init
   ```

### Monorepo構成設定 (Monorepo Configuration)

1. pnpm-workspace.yaml 作成

   ルート直下に作成し，以下を記述する．

   ```yaml
   packages:
     - 'apps/*'
     - 'packages/*'
   ```

2. .npmrc 作成

   ルート直下に作成し，以下を記述する．

   ```text
   shamefully-hoist=true
   ```

### ディレクトリ構造の構築 (Directory Structure)

以下の構成になるようにディレクトリを作成する．

```text
root/
├── apps/
│   ├── client/           # フロントエンド (Browser)
│   └── server/           # バックエンド (Node.js)
└── packages/
    └── shared/           # 共通ロジック (Shared Library)
```

- 作成コマンド例:

  ```bash
  mkdir -p apps/client apps/server packages/shared
  ```

### Git除外設定 (.gitignore)

ルート直下に `.gitignore` を作成し，以下を記述する．

```text
node_modules/
.pnpm-store/
dist/
build/
.env
.DS_Store
.vscode/*
!.vscode/extensions.json
!.vscode/launch.json
coverage/
!packages/
```

## アプリケーション雛形の作成 (Scaffolding)

### 共通ライブラリ (packages/shared)

1. 初期化とビルドツール導入

   ```bash
   cd packages/shared
   pnpm init
   pnpm add -D typescript tsup
   ```

2. 設定ファイルの調整 (package.json)

   - name: `"@repo/shared"` と命名する（推奨）．
   - main: `"./dist/index.js"`, types: `"./dist/index.d.ts"` を指定する．
   - scripts: `"build": "tsup src/index.ts --format cjs,esm --dts"` を追加する．

3. エントリーポイントの作成

   ```bash
   mkdir src
   touch src/index.ts
   ```

   ※ (例: `export * from './constants';`)

4. TypeScript設定ファイルの作成 (tsconfig.json)

   - ファイル: `packages/shared/tsconfig.json`
   - 内容:

     ```json
     {
       "compilerOptions": {
         "target": "ES2020",
         "module": "ESNext",
         "moduleResolution": "Bundler",
         "lib": ["ES2020", "DOM", "DOM.Iterable"],
         "declaration": true,
         "declarationMap": true,
         "sourceMap": true,
         "outDir": "./dist",
         "rootDir": "./src",
         "strict": true,
         "esModuleInterop": true,
         "skipLibCheck": true,
         "forceConsistentCasingInFileNames": true
       },
       "include": ["src/**/*"],
       "exclude": ["node_modules", "dist"]
     }
     ```

### フロントエンド (apps/client)

1. プロジェクト作成

   ```bash
   cd ../../apps/client
   pnpm create vite . --template preact-ts
   ```

   ※ Use rolldown-vite? » No

   ※ Install with pnpm and start now? » No

2. 依存ライブラリのインストール

   ```bash
   pnpm add pixi.js
   pnpm add @repo/shared --workspace
   ```

### バックエンド (apps/server)

1. 初期化

   ```bash
   cd ../../apps/server
   pnpm init
   ```

2. 依存ライブラリのインストール

   ```bash
   pnpm add ws
   pnpm add -D tsx typescript @types/node @types/ws
   pnpm add @repo/shared --workspace
   ```

3. サーバー用ディレクトリとファイルの作成

   ```bash
   mkdir src
   touch src/index.ts
   ```

4. 実行スクリプトの定義 (package.json)

   ```json
   "scripts": {
     "dev": "tsx watch src/index.ts"
   }
   ```

5. TypeScript設定ファイルの作成 (tsconfig.json)

   - ファイル: `apps/server/tsconfig.json`
   - 内容:

     ```json
     {
       "compilerOptions": {
         "target": "ES2022",
         "module": "NodeNext",
         "moduleResolution": "NodeNext",
         "lib": ["ES2022"],
         "strict": true,
         "noEmit": true,
         "esModuleInterop": true,
         "skipLibCheck": true,
         "forceConsistentCasingInFileNames": true,
         "baseUrl": ".",
         "paths": {
           "@repo/shared": ["../../packages/shared/src/index.ts"]
         }
       },
       "include": ["src/**/*"],
       "exclude": ["node_modules"]
     }
     ```

### 初回コミット (Initial Commit)

1. ルートに戻る

   ```bash
   cd ../..
   ```

2. ステータスの確認 (node_modulesが含まれていないこと)

   ```bash
   git status
   ```

3. Gitへ保存

   ```bash
   git add .
   git commit -m "chore: Initialize project structure and dependencies"
   ```

### GitHub リポジトリのセキュリティ設定 (GitHub Repository Security Settings)

GitHub リポジトリを作成しリモートを設定した直後に，**Dependabot alerts**（既知脆弱性の検出．UI では "Vulnerabilities" と表示）と **Dependabot security updates**（脆弱性を直す PR の自動作成）を有効化する．どちらもリポジトリごとに既定で OFF のため，有効化しないと依存パッケージの脆弱性が通知されない．詳細・トラブル対応は `.claude/skills/setup/reference.md`「GitHub リポジトリのセキュリティ設定」を参照する．

- 前提: `gh auth login` 済み，実行者がリポジトリの **admin 権限**を持つ，カレントディレクトリが当該リポジトリの clone である

1. リモートの確認

   ```bash
   gh repo view --json nameWithOwner -q .nameWithOwner
   ```

2. 有効化（冪等．再実行してよい）

   ```bash
   gh api -X PUT repos/{owner}/{repo}/vulnerability-alerts        # Dependabot alerts（依存グラフも同時に有効化）
   gh api -X PUT repos/{owner}/{repo}/automated-security-fixes    # Dependabot security updates
   ```

3. 検証

   ```bash
   gh api repos/{owner}/{repo}/vulnerability-alerts               # 成功（204）なら有効．404 なら無効
   gh api repos/{owner}/{repo}/automated-security-fixes           # {"enabled":true,...} なら有効
   ```

※ `.github/dependabot.yml` は依存バージョンの定期更新 PR の設定であり，上記の脆弱性検出とは別物．

## Docker環境定義ファイルの作成 (Configuration)

### Dockerfile の作成 (Create Dockerfile)

プロジェクトルートに `Dockerfile` を作成する．

※ Node.js v20 をベースとし，pnpm を有効化した開発用イメージ定義．

```dockerfile
FROM node:20-slim

# pnpmの準備
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# 作業ディレクトリ設定
WORKDIR /workspace

# 依存関係のコピーとインストール (キャッシュ活用)
COPY . .
RUN pnpm install

# ポート公開 (Vite:5173, Server:3000)
EXPOSE 5173 3000

# デフォルトコマンド (docker-composeで上書きするため待機)
CMD ["sleep", "infinity"]
```

### docker-compose.yml の作成（開発用）(Development Compose)

プロジェクトルートに `docker-compose.yml` を作成する．

※ ローカルのソースコードをコンテナにマウントする設定．

```yaml
version: "3.8"

services:
  app:
    container_name: pixel-paint-war-dev
    # 開発用イメージ: Node.js v20 (定義書準拠)
    image: mcr.microsoft.com/devcontainers/typescript-node:20

    # 永続化とボリュームマウント
    volumes:
      # カレントディレクトリをコンテナ内の /workspace にマウント
      - .:/workspace:cached
      # 【重要】node_modules をホスト側と切り離して高速化・安定化させる設定
      - node_modules:/workspace/node_modules

    # コマンドの上書き (コンテナを常時起動させる)
    command: sleep infinity

    # ネットワーク設定
    # Client(5173) と Server(3000) のポートを開放
    ports:
      - "5173:5173"
      - "3000:3000"

    # 環境変数
    environment:
      - NODE_ENV=development

    # ユーザー権限 (Nodeイメージ推奨のユーザー)
    user: node

volumes:
  node_modules:
```

### .devcontainer 設定の作成 (Dev Container Config)

1. ディレクトリ作成

   ```bash
   mkdir .devcontainer
   ```

2. .devcontainer/devcontainer.json 作成

   VS Codeがコンテナを認識するための設定．

   ```jsonc
   {
     "name": "Pixel Paint War Dev",
     "dockerComposeFile": "../docker-compose.yml",
     "service": "app",
     "workspaceFolder": "/workspace",

     "features": {
       "ghcr.io/devcontainers/features/node:1": {
         "version": "20",
         "pnpm": "latest"
       }
     },

     "customizations": {
       "vscode": {
         "extensions": [
           "dbaeumer.vscode-eslint",
           "esbenp.prettier-vscode",
           "editorconfig.editorconfig",
           "ms-vscode.hexeditor",
           "github.copilot",
           "github.copilot-chat"
         ],
         "settings": {
           "editor.formatOnSave": true,
           "editor.defaultFormatter": "esbenp.prettier-vscode"
         }
       }
     },

     // コンテナ起動後の初期化コマンド
     // 1. sudo chown ... : node_modules の所有権を node ユーザーに強制変更
     // 2. pnpm install   : その後，安全にインストールを実行
     // 3. build          : 最後に共通パッケージをビルド
     "postCreateCommand": "sudo chown -R node:node /workspace/node_modules && pnpm install && pnpm --filter @repo/shared build",

     // コンテナ内のユーザー
     "remoteUser": "node"
   }
   ```

### docker-compose.prod.yml の作成（本番確認用）(Production Compose)

プロジェクトルートに `docker-compose.prod.yml` を作成する．

※ 本番ビルド確認用にポートをずらし，ビルドコマンドを実行する設定．

```yaml
services:
  app:
    build: .
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=production
    command: pnpm start
```

## 本番デプロイ構成の補足 (Deployment Config)

本番環境へデプロイする際は，上記 `Dockerfile` をマルチステージビルドに修正し，軽量化を図ることが推奨される．

### Dockerfile（本番用最適化例）(Optimized Production Example)

※ 必要に応じて `Dockerfile.prod` として作成する．

```dockerfile
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY . /app
WORKDIR /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

FROM base
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/apps/server/dist /app/apps/server/dist
COPY --from=build /app/apps/client/dist /app/apps/client/dist

EXPOSE 3000
CMD [ "pnpm", "start" ]
```
