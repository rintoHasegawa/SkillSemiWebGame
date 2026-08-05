# Pixel Paint War

![タイトル画面](apps/client/public/title.png)

チーム対抗のリアルタイム陣取りペイントバトルゲームです。
最大4チームのプレイヤーがブラウザ上で同じフィールドに参加し、制限時間内に自チームの色でマスを塗りつぶして陣地を広げます。
終了時に最も多くのセルを塗ったチームが勝利です。

![ゲーム画面](.github/images/gameplay.jpg)

## 技術スタック

| 区分 | 技術 |
|---|---|
| フロントエンド | Vite + Preact + TypeScript |
| バックエンド | Node.js + TypeScript |
| 通信 | Socket.IO (WebSocket) |
| 描画 | Pixi.js (WebGL) |
| PWA | vite-plugin-pwa (インストール対応・フルスクリーン動作) |
| パッケージ管理 | pnpm workspaces (monorepo) |
| 開発環境 | Docker Dev Container |

## 推奨プレイ環境

スマートフォン・タブレットでプレイする場合は、ブラウザの「ホーム画面に追加」からWeb Appとしてインストールすることを推奨します。
フルスクリーン・横向き固定で快適にプレイできます。

## 開発環境のセットアップ

**必要なもの**: Docker、VS Code、VS Code拡張機能「Dev Containers」

1. リポジトリをクローンする
2. VS Codeでフォルダを開く
3. 左下の「><」アイコン →「Reopen in Container」を選択する
4. コンテナの起動を待つ（初回は数分かかります）

起動後、以下のコマンドで動作確認できます。

```bash
# 共有パッケージのビルド
pnpm --filter @repo/shared build

# クライアント起動（http://localhost:5173）
pnpm --filter client dev

# サーバ起動
pnpm --filter server dev
```

詳細は [ENV_02_環境構築手順.md](docs/02_ENV/ENV_02_環境構築手順.md) を参照してください。

## デプロイ

クライアント（静的ファイル）とサーバ（Node.js）を別々にデプロイします。
ビルド時に `VITE_PROD_SERVER_URL` にサーバのURLを設定する必要があります。

詳細は各手順書を参照してください。

| デプロイ先 | ドキュメント |
|---|---|
| Render | [ENV_10_Renderデプロイ手順.md](docs/02_ENV/ENV_10_Renderデプロイ手順.md) |
| 研究室サーバ（Nginx + Docker） | [ENV_11_研究室サーバデプロイ手順.md](docs/02_ENV/ENV_11_研究室サーバデプロイ手順.md) |
| 環境変数一覧 | [ENV_09_環境変数設定.md](docs/02_ENV/ENV_09_環境変数設定.md) |

## ドキュメント

### 開発ガイド

| ドキュメント | 内容 |
|---|---|
| [GUIDE_01_プロジェクト立ち上げフロー.md](docs/01_GUIDE/GUIDE_01_プロジェクト立ち上げフロー.md) | AIと協働するプロジェクト立ち上げの流れ |
| [GUIDE_02_エージェント運用ルール.md](docs/01_GUIDE/GUIDE_02_エージェント運用ルール.md) | `/implement` のエージェントチーム運用 |
| [GUIDE_03_チーム開発ルール.md](docs/01_GUIDE/GUIDE_03_チーム開発ルール.md) | 直列運用・セルフマージ等のチームルール |

Git規約・ドキュメント書式・ファイル命名・コードコメント・プロトコル追加手順は [`.claude/rules/`](.claude/rules/) に定義されており、Claude Codeに自動ロードされます。

### 環境・構成

| ドキュメント | 内容 |
|---|---|
| [ENV_01_技術スタック.md](docs/02_ENV/ENV_01_技術スタック.md) | 技術スタックとプロジェクト構成 |
| [ENV_02_環境構築手順.md](docs/02_ENV/ENV_02_環境構築手順.md) | 開発環境のセットアップ手順 |
| [ENV_04_開発コマンド.md](docs/02_ENV/ENV_04_開発コマンド.md) | 日常の開発コマンド一覧 |
| [ENV_05_Docker運用操作ガイド.md](docs/02_ENV/ENV_05_Docker運用操作ガイド.md) | Dockerの運用・操作コマンド |
| [ENV_07_ディレクトリ構造.md](docs/02_ENV/ENV_07_ディレクトリ構造.md) | ソースコードのディレクトリ構造 |

### 仕様

| ドキュメント | 内容 |
|---|---|
| [SPEC_01_ゲーム概要_画面遷移.md](docs/04_SPEC/SPEC_01_ゲーム概要_画面遷移.md) | ゲーム概要・画面遷移フロー |
| [SPEC_02_ロビー仕様.md](docs/04_SPEC/SPEC_02_ロビー仕様.md) | ロビー画面の仕様 |
| [SPEC_03_ゲームプレイ仕様.md](docs/04_SPEC/SPEC_03_ゲームプレイ仕様.md) | ゲームプレイの詳細仕様 |
| [SPEC_04_HUD_UI仕様.md](docs/04_SPEC/SPEC_04_HUD_UI仕様.md) | HUD・UIの仕様 |
| [SPEC_05_リザルト仕様.md](docs/04_SPEC/SPEC_05_リザルト仕様.md) | リザルト画面の仕様 |

### 技術詳細

| ドキュメント | 内容 |
|---|---|
| [TECH_01_通信最適化.md](docs/05_TECH/TECH_01_通信最適化.md) | 通信量削減・最適化の実装方針 |
| [TECH_02_時刻同期_ラグ対策.md](docs/05_TECH/TECH_02_時刻同期_ラグ対策.md) | 時刻同期・ラグ補正の実装方針 |
| [TECH_03_描画最適化.md](docs/05_TECH/TECH_03_描画最適化.md) | 描画パフォーマンス最適化の実装方針 |

### テスト

| ドキュメント | 内容 |
|---|---|
| [TEST_01_負荷テスト仕様.md](docs/06_TEST/TEST_01_負荷テスト仕様.md) | 負荷テストの仕様・実行手順 |

## 作者

Rinto Hasegawa, Shimoji Ryuki

## ライセンス

[MIT](LICENSE)
