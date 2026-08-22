# 環境構築手順 (Environment Setup Guide)

## 事前準備 (Prerequisites)

### 目的 (Purpose)

本ドキュメントは，「Pixel Paint War」の開発に参加する全メンバー向けの環境構築および利用ガイドである．
Monorepo構成とDocker(Dev Containers)を使用し，迅速に開発を開始する手順を記す．

### 【全員必須】共通ツールのインストール (Required Common Tools)

開発メンバー全員（管理者・参加者問わず）が以下のツールをインストールする．

1. Docker実行環境

   - 開発環境の実体（コンテナ）を動かすために必須である．
   - OSごとの選択肢:
     - Windows: WSL2（Ubuntu等）を導入し，WSL2内に Docker Engine をインストールする（Docker Desktop でも可）
     - Mac: Docker Desktop（最新版）をインストールする
     - Linux: Docker Engine をインストールする
   - インストール手順 (Ubuntu/Debian系・WSL2内含む): ターミナルで以下のコマンドを順に実行する．

     ```bash
     # 1. 公式GPG鍵とリポジトリのセットアップ
     sudo apt-get update
     sudo apt-get install -y ca-certificates curl gnupg
     sudo install -m 0755 -d /etc/apt/keyrings
     curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
     sudo chmod a+r /etc/apt/keyrings/docker.gpg

     echo \
     "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
     "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
     sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

     # 2. パッケージのインストール
     sudo apt-get update
     sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

     # 3. ユーザー権限の設定 (重要: VS Codeからsudoなしで利用するために必須)
     sudo usermod -aG docker $USER
     newgrp docker
     ```

   - 確認コマンド:

     ```bash
     docker -v
     # Docker version 20.x.x 等と表示されること
     ```

2. VS Code (Visual Studio Code)

   - メインのエディタとして使用する．最新版をインストールすること．

3. VS Code 拡張機能: "Dev Containers"

   - ID: ms-vscode-remote.remote-containers
   - 拡張機能マーケットプレイスで検索し，インストールする．
   - これを入れることで，Dockerコンテナ内でVS Codeを開くことが可能になる．

## 環境セットアップ (Setup)

### リポジトリのクローン (Clone Repository)

1. ソースコードの取得

   任意のディレクトリで以下のコマンドを実行する．

   ```bash
   git clone <GitHubのリポジトリURL>
   ```

2. ディレクトリ移動

   ```bash
   cd SkillSemiWebGame
   ```

3. 完了

   これだけで準備は完了である．
   パッケージのインストール等はDocker起動時に自動で行われるため，手動での `pnpm install` 等は不要である．

## 開発環境(Dev Container)の起動 (Launch)

### プロジェクトを開く (Open Project)

1. VS Codeを起動し，「ファイル > フォルダを開く」からプロジェクトルートを選択する．

### コンテナでの再起動 (Reopen in Container)

以下のいずれかの方法で，開発環境をコンテナ内に移行する．

**方法A: ステータスバーから**

1. ウィンドウ左下の緑色(または青色)の「><」アイコンをクリックする．
2. 表示されるメニューから「Reopen in Container」を選択する．

**方法B: コマンドパレットから**

1. [F1] または [Ctrl+Shift+P] を押下する．
2. "Reopen" と入力し，「Dev Containers: Reopen in Container」を選択する．

※ トラブルシューティング: もし起動後に node_modules が見つからない等のエラーが出た場合は，「Reopen」ではなく「Dev Containers: Rebuild Container」を選択して環境を完全に作り直してください．

### 初回ビルドの待機 (Wait for Initial Build)

1. 初回起動時は Dockerイメージのビルドと npmパッケージのインストールが行われる．(数分〜十数分かかる場合がある)
2. 右下に "Starting Dev Container" 等の通知が表示されている間は待機する．

### 起動確認 (Verify Startup)

1. 左下のアイコンが「Dev Container: Pixel Paint War Dev」と表示されていることを確認する．

2. VS Codeのターミナルを開き (`Ctrl + @`)，パスを確認する．

   成功例:

   ```text
   node@...:/workspace$
   ```

   (Windowsのパス C:\Users... ではなく Linux形式になっていれば成功)

3. 動作確認コマンドを実行する．

   ```bash
   pnpm --filter client dev
   ```

   ※ エラー時の対応: 「sh: vite: not found」等のエラーが出る場合は，自動インストールが完了していない可能性があります．ターミナルで `pnpm install` を手動実行するか，上記「コンテナでの再起動 (Reopen in Container)」の「Rebuild Container」を試してください．

   ※ pnpm 自体が起動しない場合（`ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite` 等）: 実行中の Node に対応しない pnpm がグローバルに入っている．pnpm の版は `package.json` の `packageManager`（`pnpm@10.28.2`）に固定しており，`.devcontainer/devcontainer.json` の node feature でも `"pnpmVersion": "10.28.2"` として同じ版を指定している（`"pnpm"` は feature に存在しないオプション名なので使わない）．`postcreate.sh` が起動時に版を揃えるが，手動で直す場合は `npm i -g pnpm@10.28.2` を実行する（Node 25 以降は Corepack が同梱されないため `corepack` は使えない）．`packageManager` の版を上げるときは `devcontainer.json` の `pnpmVersion` も必ず同じ版に更新すること．

   - ブラウザでの確認: ターミナルに「➜  Local:   http://localhost:5173/」と表示されたら，Google Chrome等のブラウザを開き，アドレスバーに上記URLを貼り付けて実行する．
   - 正常動作の判断基準: ゲームのタイトル画面が表示されれば，フロントエンドの環境構築は成功である．

## 開発ツールの確認 (Tools Verification)

Dockerコンテナ起動完了後，定義済みのツールが正しく自動導入されているか確認する．

※ 手動でのインストールは不要である．

### VS Code 拡張機能 (VS Code Extensions)

拡張機能サイドバーを開き，"Dev Container: Pixel Paint War Dev" セクションに以下がインストール済みであることを確認する．

- ESLint
- Prettier - Code formatter
- EditorConfig for VS Code
- Hex Editor
- GitHub Copilot

### GitHub CLI の認証 (GitHub CLI Authentication)

Issue・PR 操作に使用する GitHub CLI (`gh`) は devcontainer の feature として自動導入される．初回のみ認証を行う．

```bash
gh auth login
```

- 認証情報は Docker ボリューム（`gh-config`）に永続化されるため，コンテナを Rebuild しても再ログインは不要である．
- git の credential helper 設定（`gh auth setup-git`）はコンテナ作成時に `postcreate.sh` が自動実行する．
- ※ GitHub Projects を操作する場合は `gh auth refresh -s project` で `project` スコープを追加する．

### AI アシスタント設定 (AI Assistant Setup)

- Claude Code
  - コンテナ内のターミナルで `claude` コマンドを実行し，初回のみログイン（認証）を行う．
  - 認証情報・設定は Docker ボリューム（`claude-config`）に永続化されるため，コンテナを Rebuild しても再ログインは不要である（詳細は [ENV_05_Docker運用操作ガイド.md](ENV_05_Docker運用操作ガイド.md) の「認証情報の永続化」を参照）．
  - 運用ルールは `docs/01_GUIDE/GUIDE_02_エージェント運用ルール.md` を参照する．
- GitHub Copilot
  - devcontainer に拡張機能が含まれるが，使用は任意である．

## 構成確認 (Project Structure)

### ディレクトリ構成 (Directory Layout)

コンテナ内で `apps/client`・`apps/server`・`packages/shared` を含む Monorepo 構成が見えていることを確認する．
ルート構成の全体像は [ENV_01_技術スタック.md](ENV_01_技術スタック.md) を参照する．

## 動作確認 (Verification)

### ビルド確認 (Build Check)

※ 注意: 以下のコマンドは全て「Dev Container内のターミナル」で実行すること．

```bash
pnpm --filter @repo/shared build
```

※ shared のビルドが成功することを確認する．

### 開発サーバー起動 (Start Dev Servers)

モノレポ構成のため，個別のディレクトリに移動せず，プロジェクトルートから --filter オプションを使用して各アプリを起動する．

※ ターミナルを2つ開き，両方を同時に起動した状態で開発を進めることを推奨．

1. Client (フロントエンド) の動作確認

   - ルートディレクトリにて以下のコマンドを実行する．

     ```bash
     pnpm --filter client dev
     ```

   - ブラウザでの確認: ターミナルに「➜  Local:   http://localhost:5173/」と表示されたら，Google Chrome等のブラウザを開き，アドレスバーに上記URLを貼り付けて実行する．
   - 正常動作の判断基準: ゲームのタイトル画面が表示されれば，フロントエンドの環境構築は成功である．

2. Server (バックエンド) の動作確認

   - コマンド:

     ```bash
     pnpm --filter server dev
     ```

   - 正常動作の判断基準: ターミナルにサーバの起動ログ（リッスン開始のメッセージ）が出力され，エラーで停止しなければ構築成功である．

3. 終了方法 (重要)

   - 動作確認を終了し，開発サーバーを停止させる場合は，ターミナル上で「Ctrl + C」を押下する．

## (応用) 本番ビルドの動作確認 (Production Build Check)

本番環境と同様のDockerイメージを作成し，正しくビルド・起動できるかを確認する．
「機能開発が終わった後」や「プルリクエストを出す前」に実施することを推奨する．

具体的なコマンド（起動・ログ確認・停止）とトラブルシューティングは [ENV_05_Docker運用操作ガイド.md](ENV_05_Docker運用操作ガイド.md) の「本番環境」を参照すること．

※ Dev Container内からはDockerコマンドが使用できない場合があるため，Dev Containerを閉じてホストOSのターミナルで実行する．
