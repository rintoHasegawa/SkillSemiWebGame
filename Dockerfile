# ================================================================
# Stage 1: Builder (ビルド用の環境)
# ================================================================
FROM node:20-slim AS builder

# pnpmの準備
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# 1. 依存関係の定義ファイルをコピー
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/

# 2. 依存関係をインストール
RUN pnpm install --frozen-lockfile

# 3. ソースコードをコピー
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server

# 4. ビルド（共通ライブラリ -> サーバーの順）
RUN pnpm --filter @repo/shared build
RUN pnpm --filter server build

# 5. 開発用ライブラリを削除（本番に必要なものだけ残す）
ENV CI=true
RUN pnpm prune --prod

# ================================================================
# Stage 2: Runner (実行専用の軽量環境)
# ================================================================
FROM node:20-slim AS runner

WORKDIR /app

# Builderステージから、動かすのに必要なファイルだけをコピー
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/

# 実行環境の設定
ENV NODE_ENV=production
USER node

# サーバーを起動
WORKDIR /app/apps/server
CMD ["node", "dist/index.js"]