# ================================================================
# Stage 1: Builder (ビルド用の環境)
# ================================================================
FROM node:20-slim AS builder

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

# 4. ビルド
RUN pnpm --filter @repo/shared build
RUN pnpm --filter server build

# 5. pnpm deploy を使用して、serverアプリを /app/out に独立させる（--prodで本番環境用のみ抽出）
RUN pnpm --filter server --prod deploy /app/out

# ================================================================
# Stage 2: Runner (実行専用の軽量環境)
# ================================================================
FROM node:20-slim AS runner

WORKDIR /app

# Builderステージで抽出した独立環境（/app/out）をそのままコピーするだけ
COPY --from=builder /app/out ./

# 実行環境の設定
ENV NODE_ENV=production
USER node

# サーバーを起動
CMD ["node", "dist/index.js"]