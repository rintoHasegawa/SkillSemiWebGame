#!/usr/bin/env bash
# コンテナ作成後のセットアップスクリプト．
# 認証情報 (Claude Code / GitHub CLI) は docker-compose.yml の名前付きボリュームで
# 永続化されるため，2 回目以降の Rebuild では再ログイン不要になる．
set -euo pipefail

CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
GH_DIR="$HOME/.config/gh"
SEED_DIR="/workspace/.devcontainer/.auth-seed"

echo "▶ 1/5: 永続化ボリュームと node_modules の所有権を修正"
# 名前付きボリュームは初回マウント時に root 所有で作られることがあるため node に直す
sudo mkdir -p "$CLAUDE_DIR" "$GH_DIR" "$HOME/.local/bin"
sudo chown -R node:node "$CLAUDE_DIR" "$HOME/.config" "$HOME/.local" /workspace/node_modules

echo "▶ 2/5: 退避済み認証情報の復元 (ボリュームが空のときのみ)"
# ボリューム導入前に .devcontainer/.auth-seed へ退避した認証情報を初回だけ流し込む．
# 2 回目以降はボリュームに認証が残っているため何もしない．
if [ -d "$SEED_DIR" ]; then
  if [ ! -f "$CLAUDE_DIR/.credentials.json" ] && [ -f "$SEED_DIR/claude/.credentials.json" ]; then
    cp -a "$SEED_DIR/claude/." "$CLAUDE_DIR/"
    echo "  ✓ Claude Code の認証・設定を復元しました"
  fi
  if [ ! -f "$GH_DIR/hosts.yml" ] && [ -f "$SEED_DIR/gh/hosts.yml" ]; then
    cp -a "$SEED_DIR/gh/." "$GH_DIR/"
    echo "  ✓ GitHub CLI の認証を復元しました"
  fi
fi

echo "▶ 3/5: Claude Code CLI の確認 (無ければインストール)"
# CLI 本体 (~/.local/bin と ~/.local/share/claude) は claude-local ボリュームで
# 永続化されるが，ボリュームが新規作成された場合はここで自動インストールする
export PATH="$HOME/.local/bin:$PATH"
if command -v claude >/dev/null 2>&1; then
  echo "  ✓ claude $(claude --version 2>/dev/null || echo '(バージョン取得失敗)')"
else
  curl -fsSL https://claude.ai/install.sh | bash
  echo "  ✓ Claude Code CLI をインストールしました"
fi

echo "▶ 4/5: git と GitHub CLI の連携設定"
# gh が認証済みなら git の credential helper として gh を使う (push/pull が通る)
if gh auth status >/dev/null 2>&1; then
  gh auth setup-git
  echo "  ✓ gh auth setup-git 完了"
else
  echo "  ✗ gh 未認証です．'gh auth login' を一度実行してください (以後は永続化されます)"
fi

echo "▶ 5/5: 依存関係のインストールと shared ビルド"
pnpm install
pnpm --filter @repo/shared build

echo "✓ セットアップ完了"
