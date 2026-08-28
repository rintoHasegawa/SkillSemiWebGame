# deploy リファレンス (deploy Reference)

`/deploy`（`SKILL.md`）から参照される，Render の ID 一覧・各ステップの詳細手順・MCP ツールの呼び出し例と返り値の読み方・トラブルシューティング．
デプロイ対象の構成・環境変数・動作確認の手順は [ENV_10_Renderデプロイ手順](../../../docs/02_ENV/ENV_10_Renderデプロイ手順.md) を参照する．

## ID 一覧 (Identifiers)

**すべての MCP 呼び出しに `workspaceId` を渡すこと**（渡さないとワークスペース未選択エラーになる）．

| 項目 | ID |
| --- | --- |
| workspaceId（My Workspace） | `tea-d6bsesbh46gs73f56jrg` |
| client（pixel-paint-war-client，Static Site） | `srv-d6dcuarh46gs73cvs69g` |
| server（SkillSemiWebGame，Web Service / Docker） | `srv-d6bsjdftn9qs73dj81ig` |

## ステップ 1: 前提確認の詳細 (Prerequisites)

```bash
git fetch origin main
git branch --show-current
git status --short
git rev-parse --short HEAD
git rev-parse --short origin/main
```

**比較・デプロイの対象は常に `origin/main`** である（SKILL.md 不変条件 6）．Render がデプロイするのは対象ブランチの先端であり，ローカルの `HEAD` ではない．ローカルの状態はあくまで「ユーザーの意図とずれていないか」を確かめるためのチェックである．

| 状態 | デプロイ時の対応 | `check` での対応 |
| --- | --- | --- |
| ブランチが `main` でない | 停止．Render のデプロイ対象ブランチは `main` であるため，別ブランチの内容はデプロイされない | 警告して続行 |
| `git status --short` が空でない | 停止．未コミットの変更はデプロイに含まれないため，「反映されたはず」の取り違えを防ぐ | 警告して続行 |
| `HEAD` が `origin/main` より**古い** | 停止．`git pull origin main` を案内する | 警告して続行 |
| `HEAD` が `origin/main` より**進んでいる** | 停止．未 push のコミットはデプロイされないため，`/commit push` からのマージを案内する | 警告して続行 |

`check` で停止しないのは，Render にも git にも書き込まず副作用が無いためである（作業ブランチから「いま main をデプロイしたら何が動くか」を確かめられる方が有用）．ただし報告には**判定が `origin/main` 基準であること**と，検出した警告を必ず添える．

## ステップ 2: 判定の詳細 (Decision)

### live コミットの取得

`mcp__render__list_deploys` を各サービスに対して呼ぶ．

```json
{
  "workspaceId": "tea-d6bsesbh46gs73f56jrg",
  "serviceId": "srv-d6bsjdftn9qs73dj81ig",
  "limit": 5
}
```

返り値はデプロイの配列で，**新しい順**に並ぶ．各要素の主なフィールド:

| フィールド | 内容 |
| --- | --- |
| `id` | デプロイ ID（`dep-...`）．`get_deploy` に渡す |
| `status` | デプロイの状態（下表） |
| `commit.id` | **デプロイされたコミットの完全 SHA**．判定の起点にする |
| `commit.message` | コミットメッセージ（報告時の目印に使う） |
| `createdAt` / `finishedAt` | 作成・完了時刻（ログ取得の時刻範囲に使う） |

`status` の一覧:

| status | 意味 | 判定上の扱い |
| --- | --- | --- |
| `live` | 稼働中（正常完了） | この最新のものを判定の起点にする |
| `created` / `queued` / `build_in_progress` / `update_in_progress` | 進行中 | 進行中のデプロイがあれば，完了を待つようユーザーに伝える |
| `build_failed` / `update_failed` | 失敗 | 最新デプロイがこれなら，差分に関わらずデプロイ対象にする |
| `canceled` | 中断 | 同上 |
| `deactivated` | 後続デプロイに置き換えられた | 過去の live．起点にはしない |

`limit: 5` の範囲に `live` が 1 つも無い場合は「トラブルシューティング」を参照する．

### 差分の照合

```bash
git diff --name-only <live コミットの SHA>..origin/main
```

得られたパスを SKILL.md「ステップ 2」の対象パス表と照合する．判定の要点:

- `packages/shared/` は **両サービスの対象**である（client / server の双方が import する）
- `pnpm-lock.yaml`・`pnpm-workspace.yaml`・ルート `package.json` も **両サービスの対象**である（依存解決とワークスペース構成が変わるため）
- `apps/client/` 配下でも `apps/client/src/**/*.test.ts` のようなテストファイルはビルド成果物に影響しないが，**例外は設けない**（対象パス配下なら対象とする．判定を単純に保つ方が事故が少ない）
- `Dockerfile` は server のみの対象である（client は Static Site でありビルドコマンドで配信物を作る）
- `.dockerignore`・`docker-compose*.yml` はローカル用途であり Render のビルドには影響しないが，`Dockerfile` と同時に変わることが多いので，迷ったら server 対象に倒す

判定結果は次の形で必ず表に出す．

```text
| サービス | live コミット | 該当した変更 | 判定 |
| --- | --- | --- | --- |
| server | 2353e00 (Merge pull request #378...) | apps/server/src/rooms/room.ts, packages/shared/src/protocol/index.ts | デプロイする |
| client | 1131b71 (Merge pull request #382...) | 該当なし（docs/ と .claude/ のみ） | スキップ |
```

## ステップ 3: 事前警告の詳細 (Warnings)

```bash
git diff <live コミットの SHA>..origin/main -- packages/shared | grep -n "PROTOCOL_VERSION"
```

差分に `PROTOCOL_VERSION` の変更が含まれる場合は，デプロイ前に以下を伝える（ENV_10「デプロイ直後の一度きりの劣化」）．

- 症状: デプロイ直後の**初回起動に限り**，参加が「参加要求がタイムアウトしました」となる
- 復旧: **2 回目の起動で解消する**（クライアントが自動で更新を取得する）
- 対応: 発表・デモの直前にデプロイした場合は，本番と同じ端末で一度起動して更新を取り込ませておく

最終確認では「今から Render にデプロイしてよいか（発表・デモの最中ではないか）」を明示的に尋ねる．Static Site は成果物を上書き配信するため，アプリを開いたままのプレイヤーは遅延チャンクの 404 とリロードが発生する（ENV_10「アプリを開いている最中のデプロイ」）．

## ステップ 4: 実行の詳細 (Deploy)

`mcp__render__trigger_deploy`:

```json
{
  "workspaceId": "tea-d6bsesbh46gs73f56jrg",
  "serviceId": "srv-d6bsjdftn9qs73dj81ig"
}
```

- 返り値の `id`（`dep-...`）を控え，ステップ 5 の `get_deploy` に渡す
- **両方必要なときは server → server が `live` になったのを確認 → client** の順に流す．先に新しいサーバを立てておけば，新旧クライアントのうち新しい方はすぐ繋がり，プロトコル不一致の窓が client のビルド時間（約 35 秒）だけで済む
- **デプロイするコミットは指定できない**．`trigger_deploy` の引数は `serviceId`・`workspaceId`・`clearCache` の 3 つだけで，対象ブランチ（`main`）の最新コミットが必ずデプロイされる．判定を `origin/main` 基準で行うのはこのためである（不変条件 6）
- `clearCache: true` は**ビルドキャッシュを捨てて再ビルド**する．ビルド時間が延びるので常用しない．依存の更新が反映されない・キャッシュ由来と疑われるビルド失敗のときだけ，ユーザーの了解を得て使う
- 本サービスは両方とも Auto-Deploy 無効であるため，`trigger_deploy` の「Auto-Deploy 有効なサービスに push 後は呼ぶな」という注意書きは該当しない

## ステップ 5: 監視の詳細 (Monitoring)

`mcp__render__get_deploy`:

```json
{
  "workspaceId": "tea-d6bsesbh46gs73f56jrg",
  "serviceId": "srv-d6bsjdftn9qs73dj81ig",
  "deployId": "dep-..."
}
```

- ポーリング間隔: 初回は trigger から 20〜30 秒後，以降は 15 秒程度おきに確認する
- 完了時間の実測値: **server は約 60 秒**（clone 約 9s ／ ベースイメージ 約 8s ／ `pnpm install` 約 5.5s ／ shared・server のビルド 各 1〜2s ／ image push 約 2s ／ build cache 送出 約 12s），**client は約 35 秒**
- `status` が `live` になれば完了．`build_failed` / `update_failed` / `canceled` は失敗として扱う
- 3 分を超えても進行中のままなら，Render ダッシュボード（またはビルドログ）の確認をユーザーに促す．勝手にキャンセル・再デプロイしない

### ビルドログの取得

ビルドログは**段階的に取得する**．1 行ごとに `resource` / `level` / `type` のラベル JSON が付く冗長な形式のため，100 行も引くと数万トークンに達する．失敗箇所は末尾側にあることが多いので，まず末尾を少量だけ引いて特定を試みる．

**第 1 段階（既定）**: 末尾から 20〜30 行．

```json
{
  "workspaceId": "tea-d6bsesbh46gs73f56jrg",
  "resource": ["srv-d6bsjdftn9qs73dj81ig"],
  "type": ["build"],
  "startTime": "<デプロイの createdAt>",
  "direction": "backward",
  "limit": 30
}
```

**第 2 段階（第 1 段階で特定できない場合のみ）**: `limit` を 60〜100 に広げる．失敗が `pnpm install` 段階など**ログ前半**にある場合は `direction: "forward"` で先頭側から引く．

- `resource` は**配列**でサービス ID を渡す
- `type: ["build"]` でビルドログに絞る（実行時ログは `["app"]`）
- `startTime` にデプロイの `createdAt` を渡すと，そのデプロイ以降のログだけが得られる
- `direction: "backward"`（既定）は新しい順，`"forward"` は古い順に返る
- **最初から `limit: 100` を引かない**．エラー行（`error TS...`，`ERROR:`，`Command failed` 等）が第 1 段階で見つかればそれで足りる
- 特定できたら，該当行だけを引用して報告する（ログ全体を貼らない）

## トラブルシューティング (Troubleshooting)

### live なデプロイ／live コミットが見つからない

| 状況 | 対処 |
| --- | --- |
| `list_deploys`（`limit: 5`）に `live` が無い | `limit` を 20 に増やして再取得する．それでも無ければ，そのサービスは一度も正常デプロイされていないか履歴が古い．判定できない旨を報告し，明示指定（`/deploy server` 等）での実行をユーザーに提案する |
| `commit.id` がローカルに存在しない（`git cat-file -e <SHA>` が失敗） | `git fetch origin main` の後に再確認する．それでも無ければ停止して報告する（force push や履歴の書き換えでコミットが失われた可能性がある．この場合は差分判定が成立しないので明示指定でのデプロイを提案する） |
| 進行中（`build_in_progress` 等）のデプロイがある | 新たに trigger せず，完了を待つようユーザーに伝える |

### ビルドが失敗した

1. 「ビルドログの取得」でビルドログを引く
2. よくある失敗の切り分け:
   - `TS2307: Cannot find module '@repo/shared'` → shared のビルドが走っていない．client のビルドコマンドに `pnpm --filter @repo/shared build` が含まれているかをビルドログで確認する（**Render API の `buildCommand` は実態と食い違うことがあるため，ビルドログを正とする**）
   - `pnpm install` のロックファイル不整合 → ローカルで `pnpm install` を実行して `pnpm-lock.yaml` を更新・コミットしてから再デプロイする
   - 型エラー → ローカルで `pnpm verify`（`docs/02_ENV/ENV_04_開発コマンド.md`）を実行して再現・修正する
3. **本スキルはコードを修正しない**．失敗箇所と推奨対応を報告し，修正は `/implement` に委ねる

### サーバが起動しない（デプロイは成功したが `update_failed`）

`CORS_ORIGIN` 未設定なら server は起動時にエラーで停止する（ENV_10「server サービスへの設定」）．実行時ログ（`type: ["app"]`）を引いて確認し，環境変数の設定は**ユーザーに依頼する**（不変条件 3．環境変数の更新は自動デプロイを起動するため本スキルでは触らない）．

### Render MCP が応答しない

- Render 公式ホスト型 MCP サーバ（`https://mcp.render.com/mcp`）を local スコープで登録している．認証は API キーの `Authorization: Bearer` ヘッダ直書きである
- ツールが見つからない・401 が返る場合は，`~/.claude/.claude.json` の当該 MCP サーバ設定の Authorization ヘッダを確認する
- devcontainer では `claude-config` ボリュームで設定が永続化されている．ボリュームを削除した場合は Render ダッシュボードで API キーを再発行して再登録する
