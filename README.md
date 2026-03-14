# SkillSemiWebGame

設定値（config）の配置ルールと定数一覧は [packages/shared/src/config/README.md](packages/shared/src/config/README.md) を参照してください。

## クライアント環境変数（Vite）

`apps/client/src/config/index.ts` の `PROD_SERVER_URL` は `import.meta.env.VITE_PROD_SERVER_URL` を参照します。

- `VITE_PROD_SERVER_URL` はクライアント用の環境変数です（Viteビルド時に埋め込まれます）。
- Renderでは server サービスではなく、client をビルドして配信するサービス側で設定してください。
- 値を変更した場合は再デプロイ（再ビルド）が必要です。
- `VITE_*` の値はブラウザから参照可能なため、秘密情報は設定しないでください。

### Render での設定手順

1. Render ダッシュボードで client サービスを開く
2. `Environment` で環境変数を追加する
3. `Key`: `VITE_PROD_SERVER_URL`
4. `Value`: `https://<your-server-domain>`
5. 保存後に再デプロイする

### ローカル開発での例

`apps/client/.env.development`

```env
VITE_PROD_SERVER_URL=https://<your-server-domain>
```
