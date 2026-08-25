# Render デプロイ手順 (Render Deployment Guide)

## 概要 (Overview)

### 目的 (Purpose)

本ドキュメントは，Pixel Paint War を Render にデプロイする手順を記す．
環境変数の詳細については ENV_09_環境変数設定.md を参照すること．

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
※ 書式・正規化・未設定時の挙動の詳細は ENV_09_環境変数設定.md を参照する

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
   - Build Command: `pnpm install && pnpm --filter client build`
   - Publish Directory: `apps/client/dist`
4. 「環境変数の設定」の手順で環境変数 VITE_PROD_SERVER_URL を設定する
5. 「Create Static Site」で作成する

### 動作確認 (Verification)

1. server サービスのログで起動エラーがないことを確認する
   - `CORS_ORIGIN` が未設定の場合は起動時にエラーで停止する．その場合は「server サービスへの設定」の手順で環境変数を設定する
2. client サービスの URL にブラウザからアクセスしてゲーム画面を確認する
3. ゲームに参加できることを確認する
   - タイトル画面は表示されるがルームに参加できない場合は，`CORS_ORIGIN` の値が client サービスの URL と一致しているかを確認する．server サービスのログに `rejected_origin` が出ていれば値の不一致である

## 再デプロイ手順 (Redeployment)

### コード変更時 (On Code Changes)

**両サービスとも Auto-Deploy は無効**にしているため，main へマージしただけではデプロイされない．デプロイするには各サービスの「Manual Deploy」ボタンを手動で押すこと．

※ Claude Code に Render MCP サーバを導入している場合は，デプロイのトリガー・デプロイ状況・ログの確認を MCP ツール経由で行うこともできる．

### 環境変数変更時 (On Environment Variable Changes)

client サービスの環境変数を変更した場合は，変更後に必ず再デプロイ（再ビルド）を実施すること．

server サービスの `CORS_ORIGIN` を変更した場合は，変更後に server サービスを再デプロイすること．
また client サービスの URL を変更した場合は，`CORS_ORIGIN` の値も合わせて更新すること．
