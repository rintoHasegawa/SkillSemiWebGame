FROM node:20-slim

# pnpmの準備
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# 1. すべてのファイルを一気にコピー（これが一番確実です）
COPY . .

# 2. 依存関係のインストール
RUN pnpm install --frozen-lockfile

# 3. ビルド（共通ライブラリ -> サーバーの順）
RUN pnpm --filter @repo/shared build
RUN pnpm --filter server build

# 4. 実行ディレクトリに移動
WORKDIR /app/apps/server

# 環境変数の設定
ENV NODE_ENV=production

# ポートの開放
EXPOSE 3000

# サーバー起動
CMD ["node", "dist/index.js"]