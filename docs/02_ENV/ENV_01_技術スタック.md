# 技術スタック (Tech Stack)

## プロジェクト基本方針 (Basic Policy)

### アーキテクチャ構成: Monorepo (モノレポ)

- 目的: クライアント(Client)とサーバー(Server)で，言語(TypeScript)およびゲームロジック(移動演算・定数・型定義)を完全共有するため．
- パッケージ管理: pnpm workspaces を採用．

### コア・コンセプト (Core Concept)

- 言語: TypeScript (Strict mode)
- 通信: WebSocket (Socket.IO)
  - 全イベントを JSON 形式で送受信（開発効率とデバッグ容易性を優先）
- 描画: WebGL 2D (Pixi.js)
- 同期: サーバー権限 (Authoritative) + クライアント予測 (Prediction)

### AI活用型開発 (AI-Assisted Development)

- 採用ツール:
  - Gemini Pro (学校提供ライセンス)
  - GitHub Copilot Pro (GitHub Student Developer Pack)
- 言語選定の優位性: TypeScriptを採用することで厳密な型定義(Type/Interface)を保持する．これによりAIがコードの文脈や意図を正確に解釈可能となり，型のないJavaScriptと比較して，コード生成・補完・リファクタリングの精度が著しく向上する．

## プロジェクト構成 (Project Structure)

### 構成一覧 (Structure Overview)

```text
root/
├── .devcontainer/
│   └── devcontainer.json                               # 開発コンテナ設定
├── apps/
│   ├── client/                                         # 【演出】フロントエンド (Browser)
│   │   ├── index.html                                  # HTMLエントリ
│   │   ├── package.json                                # 依存・スクリプト
│   │   ├── public/                                     # 公開アセット (SVG・PNG等)
│   │   ├── src/                                        # ※ 詳細は ENV_07 参照
│   │   ├── tsconfig.json                               # TS設定
│   │   └── vite.config.ts                              # Vite設定
│   └── server/                                         # 【権限】バックエンド (Node.js)
│       ├── package.json                                # 依存・スクリプト
│       ├── tsconfig.json                               # TS設定
│       └── src/                                        # ※ 詳細は ENV_07 参照
├── packages/
│   └── shared/                                         # 【最重要】「真実」の定義場所（型，定数，純粋ロジック）
│       ├── package.json                                # 依存・公開設定
│       ├── tsconfig.json                               # TS設定
│       └── src/                                        # ※ 詳細は ENV_07 参照
├── test/                                                # 負荷テスト用スクリプト群
│   ├── load-bot.ts                                      # 負荷テスト実行
│   ├── load-bot.constants.ts                            # 負荷テスト定数
│   ├── package.json                                     # テスト依存・スクリプト
│   └── tsconfig.json                                    # テストTS設定
├── docs/                                                # プロジェクトドキュメント
├── .gitignore                                           # Git除外設定
├── .npmrc                                               # pnpm設定
├── docker-compose.yml                                   # 開発Compose定義
├── docker-compose.prod.yml                              # 本番Compose定義
├── Dockerfile                                           # 本番イメージ定義
├── package.json                                         # ワークスペース定義
├── pnpm-lock.yaml                                       # lockファイル
├── pnpm-workspace.yaml                                  # workspace設定
├── CLAUDE.md                                            # Claude Code設定
└── README.md                                            # プロジェクト概要
```

※ shared は client/server 両方から import して使用する．

※ ソースコード (src/) の詳細構造は [ENV_07_ディレクトリ構造.md](ENV_07_ディレクトリ構造.md) を参照．

## 技術スタック詳細 (Tech Stack)

### 共通・基盤 (Common / Shared)

- Runtime: Node.js (v20 LTS 以上)
- Package Manager: pnpm
- Build Tool: tsup (高速で軽量なTypeScriptバンドラ)

### フロントエンド (Client)

- Build Tool: Vite
- Language: TypeScript
- Rendering Engine: Pixi.js (v8)
  - 採用理由: 50人同時対戦時の大量のスプライト描画と60fps維持のため．
- UI Library: React 18 + @pixi/react
  - 採用理由: 充実したエコシステムとPixi.jsとのReact統合による効率的なUI構築のため．
- Network: socket.io-client
- PWA: vite-plugin-pwa
  - 表示モード: fullscreen（横向き固定）
  - manifest・service worker を自動生成
  - Workbox キャッシュ戦略:
    - 画像アセット: CacheFirst（最大30件，有効期限30日）
    - Socket.IO 通信（/socket.io）: キャッシュ対象外
    - SPA ナビゲーション: index.html にフォールバック
  - アイコン: icon-180.png（iOS）/ icon-192.png / icon-512.png（maskable）

### バックエンド (Server)

- Runtime: Node.js
- Execution: tsx (開発時の高速実行・ウォッチ用)
- WebSocket Library: Socket.IO
  - 採用理由: 接続管理・イベント配線を明確化しやすく，Client 側 (socket.io-client) と整合するため．
- Logic: 独自ループ (20Hz固定)
  - Physics Engine: 使用しない (shared/domains/game/gridMap/ による独自グリッド判定)

### 開発ツール (Dev Tools)

- Linter: ESLint
- Formatter: Prettier
- AI Assistant: GitHub Copilot Pro, Gemini Pro

### インフラ・コンテナ技術 (Infrastructure)

- Containerization: Docker
  - 採用理由: 開発環境(Dev Containers)と本番環境の差異を排除するため．
- Orchestration:
  - Dev: Docker Compose (ボリュームマウントによるホットリロード)
  - Prod: Docker Compose (再起動ポリシーとポート開放のみの最小構成)
- Deployment Image: Multi-stage Build (Node.js Slim)
  - ビルド戦略:
    1. Builderステージ: 全依存をインストールし，TypeScript (Shared -> Server) をコンパイル．
    2. Prune: `pnpm prune --prod` により開発依存を削除．
    3. Copy: pnpmの仕様(シンボリックリンク)に対応するため，`node_modules` を明示的にコピーする．
    4. Runnerステージ: 必要な `dist` と `node_modules` のみをコピーし，イメージサイズを最小化する．

## 開発マシンの前提条件 (Prerequisites)

本プロジェクトは Docker (Dev Containers) による開発環境統一を推奨する．
これにより，ホストOS（Windows/Mac）の環境を汚さずに構築が可能となる．

### 【必須】ホストマシンにインストールするもの (Required on Host Machine)

以下のツールのみ，開発者のPC（ホストOS）にインストールが必要である．

1. Docker実行環境

   - Docker Desktop (最新版)
   - WSL2 (Windowsの場合必須)

2. エディタ

   - VS Code (Visual Studio Code)

3. VS Code 拡張機能

   - Dev Containers (ID: ms-vscode-remote.remote-containers)

   ※ これが「必須」である．これさえあれば，以下の開発ツール群は自動セットアップされる．

4. アカウント・AI

   - GitHub Copilot Pro (Student)
   - Gemini Pro (学校提供ライセンス)

### 【自動】コンテナ内に構築されるもの（インストール不要）(Auto-Installed in Container)

以下のツールは `devcontainer.json` に定義済みであり，コンテナ起動時に自動的にインストール・設定されるため，手動導入は不要である．

1. Runtime & Package Manager

   - Node.js (v20.x LTS)
   - pnpm (Latest)

2. VS Code 拡張機能 (コンテナ内)

   - ESLint
   - Prettier
   - EditorConfig
   - Hex Editor

※ ホスト側で `node -v` や `pnpm -v` を実行する必要はなく，全て VS Code の「ターミナル (コンテナ接続済)」で行う．

## 実装上の重要ルール (Implementation Rules)

### ロジックの一元管理 (Single Source of Logic)

- 「移動速度」「ヒット判定」「マップ更新」の計算式は必ず `packages/shared` に記述する．
- Client と Server で別の計算式を書くことを禁止する（同期ズレ防止）．

### 座標系 (Coordinate System)

- 内部計算: Float (浮動小数点)
- 通信データ: Integer (整数 / 100倍して送信など圧縮を考慮)
- 描画: Float (補間処理あり)

### 依存方向 (Dependency Direction)

- OK: Client -> Shared
- OK: Server -> Shared
- NG: Client -> Server / Server -> Client (直接参照禁止)

### 通信境界の責務分離 (Network Boundary Responsibilities)

- SocketEvents の解決（イベント名の参照）は `apps/server/src/network` 配下に集約する．
- `apps/server/src/domains` 配下では `protocol` を直接 import せず，意味名の Publisher 関数を受け取って利用する．
- Socket の接続制御・受信イベント登録・切断順序制御は network 層が担当し，業務ロジック判断は domain 層が担当する．
