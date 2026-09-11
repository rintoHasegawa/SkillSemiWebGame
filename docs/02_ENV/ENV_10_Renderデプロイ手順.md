# Render デプロイ手順 (Render Deployment Guide)

## 概要 (Overview)

### 目的 (Purpose)

本ドキュメントは，Pixel Paint War を Render にデプロイする手順を記す．
環境変数の詳細については [ENV_09_環境変数設定](ENV_09_環境変数設定.md) を参照すること．

### 構成 (Configuration)

Render 上で以下の2サービスを運用する．

| 項目 | client サービス | server サービス |
| --- | --- | --- |
| サービス名 | pixel-paint-war-client | SkillSemiWebGame |
| 種別 | Static Site | Web Service (Docker) |
| 内容 | Vite でビルドした静的ファイルを配信 | Node.js バックエンド（Socket.IO） |
| URL | <https://pixel-paint-war-client.onrender.com> | <https://skillsemiwebgame.onrender.com> |
| プラン | Static Site（無料） | Free |
| リージョン | - | Singapore |

※ server サービスは Free プランのため，アイドル状態が続くとスピンダウンする．スピンダウン後の初回アクセスは起動に数十秒かかるため，デモ・発表の前には事前にアクセスして起動させておくこと．

## 環境変数の設定 (Environment Variables)

### client サービスへの設定 (Client Service Settings)

VITE_PROD_SERVER_URL はビルド時に埋め込まれるため，server サービスではなく client サービス側で設定すること．

1. Render ダッシュボードで client サービスを開く
2. 「Environment」タブを開く
3. 以下の環境変数を追加する

   ```text
   Key: VITE_PROD_SERVER_URL
   Value: https://skillsemiwebgame.onrender.com
   ```

4. 保存後に「Manual Deploy」で再ビルドする

※ 値を変更した場合は必ず再デプロイ（再ビルド）すること

### server サービスへの設定 (Server Service Settings)

CORS_ORIGIN は Socket.IO の接続を許可するオリジンを制限するために使用する．
**未設定のまま本番デプロイすると server サービスは起動時にエラーで停止する**ため，必ず設定すること．

1. Render ダッシュボードで server サービス（SkillSemiWebGame）を開く
2. 「Environment」タブを開く
3. 以下の環境変数を追加する

   ```text
   Key: CORS_ORIGIN
   Value: https://pixel-paint-war-client.onrender.com
   ```

4. 保存して server サービスを再デプロイする

※ 指定する値は**クライアント（Static Site）の URL** である．server サービス自身の URL ではないことに注意する
※ 独自ドメインを追加した場合は，カンマ区切りでオリジンを追加する
※ 書式・正規化・未設定時の挙動の詳細は [ENV_09_環境変数設定](ENV_09_環境変数設定.md) を参照する

## デプロイ手順 (Deployment Steps)

### server サービスの設定 (Server Service Setup)

server はリポジトリルートの `Dockerfile` を使った Docker デプロイである．ビルド（shared → server）と起動（`npm run start`）はすべて Dockerfile 内で定義されており，Render 側にビルドコマンド・起動コマンドの設定は不要．

1. Render ダッシュボードで「New +」→「Web Service」を選択する
2. リポジトリを接続する
3. 以下の設定を行う
   - Language: Docker
   - Dockerfile Path: `./Dockerfile`
   - Docker Build Context Directory: `.`（リポジトリルート）
4. 「Create Web Service」で作成する

### client サービスの設定 (Client Service Setup)

1. Render ダッシュボードで「New +」→「Static Site」を選択する
2. リポジトリを接続する
3. 以下の設定を行う
   - Build Command: `pnpm install && pnpm --filter @repo/shared build && pnpm --filter client build`
   - Publish Directory: `apps/client/dist`
4. 「環境変数の設定」の手順で環境変数 VITE_PROD_SERVER_URL を設定する
5. 「Create Static Site」で作成する

※ `packages/shared/dist` はリポジトリに含まれないため，client のビルドの前に必ず shared をビルドすること（省くと `TS2307` でビルドが失敗する）
※ Render API（`get_service` / MCP）が返す `buildCommand` は実際に走るコマンドと食い違うことがある．実態はビルドログ（`list_logs` の `type: build`）で確認する
※ ビルドに使う Node の版は，リポジトリ直下の `.node-version`（内容 `26`＝26 系の最新に解決される）で固定している．指定が無いと Render はサービス作成日時点の既定版を使い，開発環境とずれるためである．Render は `NODE_VERSION` 環境変数 → `.node-version` → `.nvmrc` → `package.json` の `engines` の順に参照するので，client サービスに環境変数 `NODE_VERSION` を設定しないこと（設定すると `.node-version` より優先される）．Dev Container（`devcontainer.json` の node feature の `version`）・server の `Dockerfile`（`FROM node:26-slim`）と同じメジャーにそろえており，版を上げるときは 3 箇所を同時に更新する（参考: <https://render.com/docs/node-version>）

### 動作確認 (Verification)

1. server サービスのログで起動エラーがないことを確認する
   - `CORS_ORIGIN` が未設定の場合は起動時にエラーで停止する．その場合は「server サービスへの設定」の手順で環境変数を設定する
2. client サービスの URL にブラウザからアクセスしてゲーム画面を確認する
3. ゲームに参加できることを確認する
   - タイトル画面は表示されるがルームに参加できない場合は，`CORS_ORIGIN` の値が client サービスの URL と一致しているかを確認する．server サービスのログに `rejected_origin` が出ていれば値の不一致である

## 再デプロイ手順 (Redeployment)

### コード変更時 (On Code Changes)

**両サービスとも Auto-Deploy は無効**にしているため，main へマージしただけではデプロイされない．デプロイするには各サービスの「Manual Deploy」ボタンを手動で押すこと．

### Claude Code の `/deploy` を使う場合 (Using the /deploy Skill)

Render MCP サーバーを導入している環境では，Claude Code のスキル `/deploy` で選択的なデプロイを行える（定義は `.claude/skills/deploy/`）．

| 引数 | 動作 |
| --- | --- |
| `/deploy` | 判定して必要なサービスだけをデプロイする |
| `/deploy check` | 判定のみ行う（dry-run．デプロイはしない） |
| `/deploy server` / `/deploy client` | 判定を飛ばして指定サービスだけをデプロイする |

動作の要点は以下のとおり．

- **判定の起点は Render 上で現在 live なコミット**である．`list_deploys` で得た live コミットと `origin/main` の `git diff --name-only` を取り，変更が及ぶサービスだけをデプロイする
  - server の対象パス: `apps/server/`，`packages/shared/`，`Dockerfile`，`pnpm-lock.yaml`，`pnpm-workspace.yaml`，ルート `package.json`
  - client の対象パス: `apps/client/`，`packages/shared/`，`pnpm-lock.yaml`，`pnpm-workspace.yaml`，ルート `package.json`，`.node-version`
  - `docs/`・`test/`・`.claude/`・`.github/` 等だけの変更ならどちらもデプロイしない
  - 最新デプロイが `live` でない（`build_failed` 等）サービスは，差分に関わらずデプロイ対象になる
- 両方必要なときは **server → live 確認 → client** の順に流す（プロトコル不一致の窓を短くするため）
- **ユーザーが明示的に起動した時のみ**動く（Claude が自発的に実行することはない）．ブランチが `main` でない・作業ツリーが汚れている・`HEAD` が `origin/main` と一致しない場合は停止する（`check` は読み取りのみのため警告のみで続行する）
- 環境変数は変更しない（環境変数の更新は自動で最新 main のデプロイを起動してしまうため，本スキルの責務外）
- デプロイ後の**動作確認は人間が行う**（「動作確認」の手順を参照）

※ 所要時間の実測値は server 約 60 秒・client 約 35 秒である．

### Build Filters ではなく差分判定を採る理由 (Why Not Build Filters)

Render には push 時に変更パスを見て自動デプロイの要否を決める Build Filters があるが，本プロジェクトでは採用せず，`/deploy` 側の差分判定を採る．

- Build Filters は **push 単位でしか変更を見ない**ため，「前回デプロイから複数のマージが溜まった」状態を正しく扱えない（デプロイ済みコミットからの累積差分ではなく，直近 push の差分だけで判断される）
- Build Filters は Auto-Deploy を有効にして初めて機能するが，Auto-Deploy を有効にすると**デプロイのタイミングを制御できず**，「発表・デモの最中はデプロイしない」（後述「アプリを開いている最中のデプロイ」）が守れない

### 環境変数変更時 (On Environment Variable Changes)

client サービスの環境変数を変更した場合は，変更後に必ず再デプロイ（再ビルド）を実施すること．

server サービスの `CORS_ORIGIN` を変更した場合は，変更後に server サービスを再デプロイすること．
また client サービスの URL を変更した場合は，`CORS_ORIGIN` の値も合わせて更新すること．

### デプロイ直後の一度きりの劣化 (One-Time Degradation After Deploy)

プロトコルバージョン照合（[SPEC_01_ゲーム概要_画面遷移](../04_SPEC/SPEC_01_ゲーム概要_画面遷移.md) の「プロトコルバージョンの照合」）を導入した版をデプロイした直後は，PWA にキャッシュされている旧クライアントがバージョンを送らないためサーバーに接続を拒否される．

- 症状: そのデプロイ直後の**初回起動に限り**，参加が「参加要求がタイムアウトしました」となる
- 復旧: クライアントが自動で更新を取得するため，**2 回目の起動で解消する**
- 対応: 既知の挙動であり障害ではない．server サービスのログに `rejected_protocol_version` が出ていればこのケースである

※ 発表・デモの直前にデプロイした場合は，本番と同じ端末で一度起動して更新を取り込ませておくこと．

### アプリを開いている最中のデプロイ (Deploying While Clients Are Open)

Static Site は成果物を上書き配信するため，デプロイするとハッシュ付きの旧アセットは消える．プレイヤーがアプリを開いたままデプロイすると，遅延読み込みのチャンクが 404 になりうる．

- 症状: ゲーム開始時に `assets/*.js` の 404 とゲーム画面のエラー表示が出る
- 復旧: クライアントが自動で更新チェックとリロードを行う（[SPEC_01_ゲーム概要_画面遷移](../04_SPEC/SPEC_01_ゲーム概要_画面遷移.md) の「遅延チャンクの取得失敗からの復旧」）．リロードでタイトル画面に戻るため，参加中のルーム・試合からは抜ける
- 対応: 自動復旧はあくまで保険である．**発表・デモの最中はデプロイしない**こと
