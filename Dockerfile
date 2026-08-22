# --- ステージ1: ビルド ---
FROM node:26-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# pnpmの確認をスキップさせるための設定
ENV CI=true

WORKDIR /app

# モノレポ全体のファイルをコピー
COPY . .

# 依存関係のインストール（フローズンロックファイルで確実な再現性を確保）
RUN pnpm install --frozen-lockfile

# 共通ライブラリをビルド（必須手順）
RUN pnpm --filter @repo/shared build
# サーバーアプリをビルド
RUN pnpm --filter server build
# 実行に不要なdevDependenciesを削除
RUN pnpm prune --prod

# --- ステージ2: 本番実行 ---
FROM node:26-slim AS runner
WORKDIR /app

# 本番実行に必要なファイルだけを抽出
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json

# 環境変数のデフォルト設定
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# サーバー起動（apps/server/package.json の start スクリプトを呼び出す）
WORKDIR /app/apps/server
CMD ["npm", "run", "start"]