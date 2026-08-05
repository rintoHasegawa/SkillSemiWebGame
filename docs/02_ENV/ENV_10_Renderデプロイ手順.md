# Render デプロイ手順 (Render Deployment Guide)

## 概要 (Overview)

### 目的 (Purpose)

本ドキュメントは，Pixel Paint War を Render にデプロイする手順を記す．
環境変数の詳細については ENV_09_環境変数設定.md を参照すること．

### 構成 (Configuration)

Render 上で以下の2サービスを運用する．

- client サービス: Vite でビルドした静的ファイルを配信
- server サービス: Node.js バックエンドを動作させる Web Service

## 環境変数の設定 (Environment Variables)

### client サービスへの設定 (Client Service Settings)

VITE_PROD_SERVER_URL はビルド時に埋め込まれるため，server サービスではなく client サービス側で設定すること．

1. Render ダッシュボードで client サービスを開く
2. 「Environment」タブを開く
3. 以下の環境変数を追加する

   ```text
   Key: VITE_PROD_SERVER_URL
   Value: https://<your-server-domain>
   ```

4. 保存後に「Manual Deploy」または自動デプロイで再ビルドする

※ 値を変更した場合は必ず再デプロイ（再ビルド）すること

## デプロイ手順 (Deployment Steps)

### server サービスの設定 (Server Service Setup)

1. Render ダッシュボードで「New +」→「Web Service」を選択する
2. リポジトリを接続する
3. 以下の設定を行う
   - Environment: Node
   - Build Command: `pnpm --filter @repo/shared build && pnpm --filter server build`
   - Start Command: `node apps/server/dist/index.js`
4. 「Create Web Service」で作成する

### client サービスの設定 (Client Service Setup)

1. Render ダッシュボードで「New +」→「Static Site」を選択する
2. リポジトリを接続する
3. 以下の設定を行う
   - Build Command: `pnpm --filter @repo/shared build && pnpm --filter client build`
   - Publish Directory: `apps/client/dist`
4. 「環境変数の設定」の手順で環境変数 VITE_PROD_SERVER_URL を設定する
5. 「Create Static Site」で作成する

### 動作確認 (Verification)

1. server サービスのログで起動エラーがないことを確認する
2. client サービスの URL にブラウザからアクセスしてゲーム画面を確認する

## 再デプロイ手順 (Redeployment)

### コード変更時 (On Code Changes)

main ブランチへのマージを契機に自動デプロイが走る（Auto-Deploy 有効時）．
手動で行う場合は各サービスの「Manual Deploy」ボタンを押す．

### 環境変数変更時 (On Environment Variable Changes)

client サービスの環境変数を変更した場合は，変更後に必ず再デプロイ（再ビルド）を実施すること．
