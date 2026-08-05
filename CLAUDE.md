# Pixel Paint War

チーム対抗のリアルタイム陣取りペイントバトルゲーム．最大4チームがブラウザ上で同じフィールドに参加し，制限時間内に自チームの色でマスを塗り合う（Vite + Preact + Pixi.js / Node.js + Socket.IO，pnpm workspaces monorepo）．

## 開発進捗

進捗・タスクは GitHub Issues と git 履歴で追う（GUIDE_03）．現在のタスクは `gh issue list` で確認する．`CLAUDE.md` には進捗を書かない．

## 必須ルール（コード実装時）

- コメント規則・プロトコル追加手順・ゲーム定数変更時の SPEC 更新は `.claude/rules/`（coding-style / protocol-changes / game-config-spec）に定義されており，該当ファイル編集時に自動ロードされる
- ファイル・ディレクトリの追加・削除・移動を行った場合は，`docs/02_ENV/ENV_07_ディレクトリ構造.md` を合わせて更新する（対象: `apps/client/src`，`apps/server/src`，`packages/shared/src` 配下．既存の記載粒度に合わせる）

### Git 運用

- ブランチ名・コミットメッセージの書式は `.claude/rules/git-conventions.md` に従う（常時ロードされる）
- コミットは `/commit` を使用する（push・PR 作成は `/commit push`）
- セッション開始時に `[sync-check]` の警告が表示された場合は必ず内容を認識し，古い `main` から作業を始めない
- **`/commit` はユーザーが明示的に指示した時のみ実行する．Claude が自発的に `/commit` や `git commit` を呼んではならない**（`/implement` 完了後も，案内するだけで自分ではコミットしない．`/commit` skill は `disable-model-invocation` によりユーザー起動限定として強制されている）
  - **例外**: 以下の無人運転ループはユーザー承認済みの例外として専用ブランチに自律コミットする．いずれも push・PR・マージ・`main` への操作はしない（取り込みは人間が `/commit push` 等で行う）
    - `/auto-refactor`（リファクタ／ドキュメント整理ループ）→ `refactor/` 専用ブランチ
    - `/auto-audit`（バグ／脆弱性の巡回監査ループ）→ `fix/` 専用ブランチ

### チーム開発（GUIDE_03 準拠）

- 原則として並行作業を行わず，1 人ずつ直列で開発する（進行中の作業は 1 件）
- タスクは GitHub Issues で管理する．`/task-create`（起票）・`/task-start <Issue番号>`（着手）・`/task-handoff`（引継ぎ）を使用する
- マージは**条件付きセルフマージ**（テスト緑・Phase 1 動作確認済み・`/implement` 完走が条件．GUIDE_03）
- 共有設定（`CLAUDE.md` のルール部・`.claude/`）の変更は専用 PR とし，他メンバー 1 名の Approve を必須とする

### エージェントチーム（GUIDE_02 準拠）

- 実装は `/implement <タスク>` で開始する（コーディング → テスト → リファクタリング → ドキュメント更新）
- Phase 1 後に人間が動作確認，Phase 2 でテスト失敗時のみ方針判断
- Phase 2 成功後は Phase 3 → Phase 4 まで自動で進む（Phase 4 で更新がある場合のみ確認）
- テスト・リファクタリングをスキップしない

### 開発コマンド

- 起動・テスト・lint 等の開発コマンドは `docs/02_ENV/ENV_04_開発コマンド.md` にまとめる．**実行前に必ず参照し，推測でコマンドを試さない**
- コマンドが新しく確定・変更された時は同ファイルに反映する（`/implement` の Phase 4 でも見直される）

### 手動確認が必要な作業（自分で完了させないこと）

以下は実装完了後にユーザーへ報告し，確認・実施を依頼すること．

- 外部サービスの設定（Render 等のコンソール操作，セキュリティルール変更等）
- 実機・ブラウザでの動作確認（特にスマホ実機・PWA 動作）
- デプロイ作業（Render・研究室サーバ）

## ドキュメント

設計・規約に関する情報は docs/ にある．
コードを書く前に関連するファイルを読むこと．

### 01_GUIDE（規約・ルール）

- プロジェクト立ち上げフロー: docs/01_GUIDE/GUIDE_01_プロジェクト立ち上げフロー.md
- エージェント運用ルール: docs/01_GUIDE/GUIDE_02_エージェント運用ルール.md
- チーム開発ルール: docs/01_GUIDE/GUIDE_03_チーム開発ルール.md
- ※ Git 規約・ドキュメント書式・命名規則・進捗記録は `.claude/rules/`（git-conventions / markdown-style / docs-naming / progress-log）に定義されている（git-conventions は常時，他は該当ファイル編集時に自動ロード）
- ※ プロジェクト固有規約も `.claude/rules/`（coding-style / protocol-changes / game-config-spec）にある

### 02_ENV（環境）

- 技術スタック: docs/02_ENV/ENV_01_技術スタック.md
- 環境構築手順: docs/02_ENV/ENV_02_環境構築手順.md
- 管理者用環境構築手順: docs/02_ENV/ENV_03_管理者用環境構築手順.md
- 開発コマンド: docs/02_ENV/ENV_04_開発コマンド.md
- Docker運用操作ガイド: docs/02_ENV/ENV_05_Docker運用操作ガイド.md
- テスト操作手順: docs/02_ENV/ENV_06_テスト操作手順.md
- ディレクトリ構造: docs/02_ENV/ENV_07_ディレクトリ構造.md
- スマホ実機デバッグ手順: docs/02_ENV/ENV_08_スマホ実機デバッグ手順.md
- 環境変数設定: docs/02_ENV/ENV_09_環境変数設定.md
- Renderデプロイ手順: docs/02_ENV/ENV_10_Renderデプロイ手順.md
- 研究室サーバデプロイ手順: docs/02_ENV/ENV_11_研究室サーバデプロイ手順.md
- TypeScript概要: docs/02_ENV/ENV_12_TypeScript概要.md

### 03_PLAN（計画）

- 移動テスト実装計画: docs/03_PLAN/PLAN_01_移動テスト実装計画.md

### 04_SPEC（仕様）

- ゲーム概要・画面遷移: docs/04_SPEC/SPEC_01_ゲーム概要_画面遷移.md
- ロビー仕様: docs/04_SPEC/SPEC_02_ロビー仕様.md
- ゲームプレイ仕様: docs/04_SPEC/SPEC_03_ゲームプレイ仕様.md
- HUD・UI仕様: docs/04_SPEC/SPEC_04_HUD_UI仕様.md
- リザルト仕様: docs/04_SPEC/SPEC_05_リザルト仕様.md

### 05_TECH（技術詳細）

- 通信最適化: docs/05_TECH/TECH_01_通信最適化.md
- 時刻同期・ラグ対策: docs/05_TECH/TECH_02_時刻同期_ラグ対策.md
- 描画最適化: docs/05_TECH/TECH_03_描画最適化.md

### 06_TEST（テスト）

- 負荷テスト仕様: docs/06_TEST/TEST_01_負荷テスト仕様.md
