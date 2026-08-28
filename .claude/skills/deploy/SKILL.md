---
name: deploy
model: inherit
description: "Render の 2 サービス（client / server）を選択的にデプロイする．Render 上で live なコミットと origin/main の差分から，どちらのサービスの再デプロイが必要かを判定し，必要なものだけを trigger_deploy で流して完了まで監視する．ユーザーが明示的に起動した時のみ実行する．"
argument-hint: "[check|server|client（省略時は自動判定してデプロイ）]"
disable-model-invocation: true
---

あなたは **Render デプロイの実行者**です．無料枠のビルド時間を無駄にしないため，「Render 上で現在 live なコミット」と `origin/main` の差分を見て，**変更が及ぶサービスだけ**を再デプロイします．
手順・ID・MCP ツールの読み方の詳細は `.claude/skills/deploy/reference.md` にあるので，作業前に必ず読むこと．

## 委譲しない理由 (Why This Skill Is Not Delegated)

`/commit` や `/deps-update` は実作業を ops-runner に委譲するが，**本スキルは主要な処理をメインループで実行する**．

- ops-runner の許可ツール（`.claude/agents/ops-runner.md`）に `mcp__render__*` が含まれておらず，**Render MCP を呼べない**
- 作業量が MCP 呼び出し数回と `git diff` 一発と小さく，委譲のオーバーヘッド（手順書の読み込み・往復）の方が大きい

## 不変条件 (Invariants)

1. **ユーザーが起動した時だけ動く**: Claude が自発的に本スキルを呼んではならない（`disable-model-invocation: true` で強制されている）
2. **`main` 以外のブランチでは原則デプロイしない**: Render のデプロイ対象ブランチは `main` である．現在のブランチが `main` でなければ停止してユーザーに確認する
3. **環境変数は触らない**: `mcp__render__update_environment_variables` は呼ばない．環境変数の更新は**自動で最新 `main` のデプロイを起動してしまう**ため，本スキルの責務外とする（環境変数の変更は ENV_10「環境変数の設定」に従い人間が行う）
4. **判定の起点は必ず「Render 上で現在 live なコミット」**: ローカルに前回デプロイの記録を持たない（記録は必ず実態とずれる）
5. **すべての MCP 呼び出しに `workspaceId` を渡す**（reference.md「ID 一覧」）
6. **差分の比較対象は `origin/main` である**: Render がデプロイするのは対象ブランチ（`main`）の先端であり，ローカルの `HEAD` ではない．`git diff` の相手は必ず `origin/main` を使う

## 引数 (Arguments)

`$ARGUMENTS` を次のように解釈する．

| 引数 | 動作 |
| --- | --- |
| `check` | ステップ 2 までの判定のみを行い，デプロイはしない（dry-run） |
| `server` / `client` | 判定を飛ばして指定サービスだけをデプロイする（差分が無くても流す．明示指定であるため） |
| 省略時 | 判定して必要なサービスだけをデプロイする |

`server client` のように両方を指定した場合は，ステップ 4 の順序（server → client）に従う．

## ステップ 1: 前提確認 (Prerequisites)

```bash
git fetch origin main
git branch --show-current    # main であること
git status --short           # 空（クリーン）であること
git rev-parse --short HEAD
git rev-parse --short origin/main
```

**比較・デプロイの対象は常に `origin/main` である**（不変条件 6）．ローカルの `HEAD` ではない．

| 状態 | `check`（読み取りのみ） | デプロイ時 |
| --- | --- | --- |
| ブランチが `main` でない | 警告して続行 | **停止**（不変条件 2） |
| 作業ツリーが汚れている | 警告して続行 | **停止**（未コミットの変更はデプロイされないため，取り違えを防ぐ） |
| `HEAD` が `origin/main` と一致しない | 警告して続行 | **停止**（ローカルが古いなら `git pull`，進んでいるなら push とマージが先である旨を伝える） |

`check` は Render にも git にも書き込まないため，作業ブランチからでも判定を試せるようにする．ただし**判定結果が `origin/main` 基準であること**を報告に明記する．

## ステップ 2: 判定 (Decide)

各サービスについて以下を行う（`server` / `client` を明示指定された場合は本ステップを飛ばす）．

1. `mcp__render__list_deploys`（`limit: 5`）でデプロイ履歴を取得し，**最新の `status: "live"`** のデプロイからその `commit.id` を得る
2. そのコミットがローカルに無い場合は `git fetch origin main` してから再確認する．それでも無ければ停止して報告する（reference.md「トラブルシューティング」）
3. `git diff --name-only <live コミット>..origin/main` の結果を，以下の対象パスと照合する

| サービス | 対象パス |
| --- | --- |
| server | `apps/server/`，`packages/shared/`，`Dockerfile`，`pnpm-lock.yaml`，`pnpm-workspace.yaml`，ルート `package.json` |
| client | `apps/client/`，`packages/shared/`，`pnpm-lock.yaml`，`pnpm-workspace.yaml`，ルート `package.json` |

- どちらの対象パスにも当たらない変更（`docs/`，`test/`，`.claude/`，`.github/`，`scripts/`，`README.md`，`LICENSE` 等）**だけ**の場合は，そのサービスはデプロイ不要とする
- 最新デプロイの `status` が `live` 以外（`build_failed` / `update_failed` / `canceled` 等）の場合は，**差分に関わらずそのサービスを対象とする**（現在稼働しているコードが古い・壊れている可能性があるため）
- **判定の根拠を必ず表に出す**: 各サービスの live コミットの短縮 SHA・該当した変更パス（または「該当なし」）・結論（デプロイする／しない）

`check` の場合はここまでの判定結果を報告して終了する．

## ステップ 3: 事前警告と最終確認 (Warn & Confirm)

デプロイ対象が 1 つ以上ある場合のみ行う．

- `git diff <live コミット>..origin/main -- packages/shared` に `PROTOCOL_VERSION` の変更が含まれる場合は，**デプロイ前に** ENV_10「デプロイ直後の一度きりの劣化」を警告する（旧クライアントがキャッシュされている端末では初回起動の参加がタイムアウトし，2 回目の起動で解消する）
- デプロイ対象・所要時間の見込みを示したうえで，**ユーザーの最終確認を取る**．ENV_10 に「発表・デモの最中はデプロイしない」とあるため，**発表・デモ中でないこと**の確認を含める

## ステップ 4: 実行 (Deploy)

`mcp__render__trigger_deploy` でデプロイする（reference.md「MCP ツールの呼び出し」）．

- **両方必要なときは server → live 確認 → client の順**に流す．プロトコルの不一致が生じる窓を短くするため，先に新しいサーバを立ててから新しいクライアントを配信する
- 片方だけのときはそのサービスだけを流す

## ステップ 5: 監視 (Monitor)

`mcp__render__get_deploy` で `live` または失敗系ステータスになるまで追う．

- ポーリング間隔の目安: 最初は 20〜30 秒後，以降は 15 秒程度おき
- 実測値: **server は約 60 秒**，**client は約 35 秒**で完了する．3 分を超えても終わらない場合は Render ダッシュボードの確認をユーザーに促す
- 失敗（`build_failed` / `update_failed`）した場合は `mcp__render__list_logs`（`resource: [サービス ID]`，`type: ["build"]`，デプロイ開始時刻以降）でビルドログを引き，**失敗箇所を特定して報告する**．勝手に再デプロイしない

## ステップ 6: 報告 (Report)

- **デプロイしたサービス**: サービス名・デプロイ ID・デプロイしたコミット・所要時間・最終ステータス
- **スキップしたサービス**: サービス名と理由（live コミットと `origin/main` の差分が対象パスに当たらない等）
- 失敗があれば，ビルドログから特定した失敗箇所と推奨対応
- **動作確認は人間の仕事**であるため，ENV_10「動作確認」の手順（server のログに起動エラーがないこと → client の URL にブラウザからアクセス → ゲームに参加できること）を案内する．`PROTOCOL_VERSION` の警告を出した場合は，本番と同じ端末で一度起動して更新を取り込ませることも案内する

## 停止条件 (Stop Conditions)

- ブランチが `main` でない／作業ツリーが汚れている／`HEAD` が `origin/main` と一致しない → ステップ 1 で停止（**`check` のときは停止せず警告して続行する**．読み取りのみで副作用が無いため）
- live なデプロイが見つからない／live コミットがローカルに存在しない → ステップ 2 で停止（reference.md「トラブルシューティング」）
- Render MCP が応答しない → 停止し，`.claude.json` の Authorization ヘッダの確認を案内する
- ユーザーが最終確認で承認しなかった → デプロイせずに終了する
