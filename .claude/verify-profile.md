# 検証プロファイル (Verify Profile)

Pixel Paint War の自動動作確認（`/verify`・`/implement` の Phase 1b）で verifier が従う検証プロファイルである．雛形は `.claude/skills/verify/profile-template.md`．
検証中に「ここに書いていなかったせいで間違えた」ことが起きたら，その場で本ファイルに追記する．

## 種別・検証手段 (Target & Method)

- リアルタイム対戦の Web ゲーム（React + Pixi.js の client ／ Socket.IO の server）
- ヘッドレスブラウザ（Playwright ＋ Chromium）でプレイヤー 1 人を操作し，他のプレイヤーは Socket.IO の Bot（負荷テスト Bot `test/load-bot.ts` と同じプロトコル）で用意する
- canvas 内の状態（座標・チーム・塗り率・残り時間・画面フェーズ等）は，開発モードの client だけが公開する読み取り専用のデバッグフック（`window.__PIXEL_PAINT_WAR_DEBUG__.getSnapshot()`）で機械判定する．見た目はスクリーンショットで確認する

## 検証対象の環境 (Target Environments)

- ローカルの接続先: `http://localhost:5173`（client．Vite dev サーバー．`/socket.io` は server へプロキシされる）・`http://localhost:3000`（server．Socket.IO）
- ローカル以外で許可する環境: なし
- 接続を禁止する環境（拒否リスト）: どんな場合もアクセスしない．ランナーのガード（`scripts/verify/lib/guard.mjs`）も同じリストで遮断する
  - Render 本番: `https://pixel-paint-war-client.onrender.com`（client）・`https://skillsemiwebgame.onrender.com`（server）・その他 `*.onrender.com`
  - 研究室サーバ: `http://192.168.0.10:8803` および任意のホストのポート `8803`（Nginx の公開ポート）
  - ローカルでも `localhost:3001`（`docker-compose.prod.yml` の本番コンテナ）等，上記 2 ポート以外は許可しない

## 実行コマンド (Run Command)

- シナリオの置き場所: `.verify/<概要（kebab-case）>/scenario.mjs`（`.gitignore` 済み．ESM の `.mjs` で書く）
- 実行コマンド: `pnpm verify:e2e .verify/<概要>/scenario.mjs`
  - 試合時間（秒）はシナリオの `export const options = { gameDurationSec: 30 };` で指定する．一時的に変える場合は `--game-duration-sec <秒>` を付ける（CLI が優先）．受け付けるのは 10〜180 の整数で，範囲外は終了コード `2`．指定しなければ既定の 180 秒
  - 実行時間の上限は既定 600 秒．変える場合は `--timeout-sec <秒>` を付ける
  - 接続せずに出力先だけ確認する場合は `--dry-run` を付ける
- 出力先: `.verify/<概要>/run-<YYYYMMDD-HHMMSS>/`（`.gitignore` 済み）．実行ごとに別ディレクトリへ出力され，前回の証拠は上書きされない
  - リポジトリにコミット済みのシナリオ（`scripts/verify/scenarios/*.mjs`）は `.verify/_scenarios/<シナリオ名>/run-<日時>/` に出力される
- 出力されるもの:
  - `result.json`: `status`（`PASS` / `FAIL` / `ERROR`）・チェックごとの判定（`results`）・観測値（`notes`）・ページの問題（`problems`: コンソールエラー・未捕捉例外・HTTP 4xx/5xx）・ガードがブロックした通信（`blockedRequests`）・Bot の要約（`bots`）・後始末の結果（`cleanup`）・試合時間の扱い（`gameDuration`: `requestedSec`・`source`・`status`・`observedSec`）・エラー（`errors`）・警告（`warnings`）
  - `NN-pass-<チェック名>.png` / `NN-fail-<チェック名>.png` / `NN-error.png`: スクリーンショット
  - `server.log` / `client.log`: ランナーがサービスを起動した場合のみ
- 終了コード: `0` = PASS ／ `1` = FAIL または ERROR（中身は `result.json`）／ `2` = 前提未充足・引数誤り（標準エラーに理由と実行すべきコマンドが出る）
- `pnpm` は verifier の許可コマンドに含まれるため，追加の許可設定は不要

## 前提条件と確認方法 (Preconditions)

ランナーは起動時に以下を自動で確認し，満たさない項目と実行すべきコマンドを表示して終了コード `2` で終了する．verifier は終了コード `2` を見たら，下表の「満たされない場合」に従う．

| 前提条件 | 確認方法 | 満たされない場合 |
| --- | --- | --- |
| 依存がインストール済み（`playwright`・`socket.io-client`・client の `vite`・server の `tsx`） | `pnpm verify:e2e <シナリオ>` の前提確認の出力 | `pnpm install` を実行してよい |
| shared がビルド済み（`packages/shared/dist`） | 同上 | `pnpm shared:build` を実行してよい |
| Playwright の Chromium とシステム依存が導入済み | 同上（`Playwright の Chromium` の行）．起動失敗は `result.json` の `errors` | 検証不能とし，人間に `pnpm --filter verify-e2e exec playwright install --with-deps chromium`（sudo を使う．devcontainer の Rebuild でも導入される）を案内する |
| ポート 5173 / 3000 を別のプロセスが使っていない | ランナーが応答内容で判定する | 検証不能とし，ポートを使っているプロセスの確認を人間に依頼する（停止しない） |

※ server・client の起動と停止はランナーが行う．既に起動済み（人間が `pnpm --filter server dev` / `pnpm --filter client dev` で起動している）なら，それを使うだけで停止しない．verifier が手作業で起動・停止しない
※ client は**開発モード**（Vite dev サーバー）でなければデバッグフックが公開されない．`pnpm --filter client preview` 等の本番ビルドでは検証できない

## 認証方法・ロール (Auth & Roles)

- 認証なし．タイトル画面でプレイヤー名とルーム ID を入力するだけで参加できる
- 「ロール」に相当するのはルームのオーナー（ホスト）とメンバーである．最初にルームへ入ったプレイヤーがオーナーになり，ゲーム設定の変更とゲーム開始ができる
  - ブラウザのプレイヤーをオーナーにする場合: ブラウザで先に参加してから Bot を参加させる（サンプルシナリオの順序）
  - メンバー側の画面を確認する場合: Bot を先に参加させてからブラウザで参加し，Bot の `startGame()` で開始する
- 資格情報は存在しない．本番の URL・設定値を使わない

## テストデータの規約 (Test Data Rules)

- 命名: ルーム ID・プレイヤー名・Bot 名は必ず `verify-` で始める（`ctx.roomId`・`ctx.playerName()`・`bots.join()` は自動でそうなる．ヘルパーは `verify-` 以外を拒否する）
  - ルーム ID・プレイヤー名は 32 文字以内（SPEC_02 の入力条件）
  - 負荷テスト Bot が使うルーム ID `1` や，人間が使いそうな短い ID を使わない（人間が同じ server で遊んでいるルームに混ざらないため）
- データストア: DB は無い．ルームとゲーム状態は server のメモリ上にだけあり，全員が抜けるかゲームが終わると消える
- 後始末: ランナーがシナリオの成否に関わらず以下を行う（シナリオには書かない）
  - Bot の切断 → ブラウザの終了 → ランナーが起動した server / client のプロセスグループの停止（PID 指定．人間が起動したものは止めない）
  - 結果は `result.json` の `cleanup` に記録される
- 一時ファイル: 出力ディレクトリ（`.verify/` 配下）だけ．証拠として残すため削除しない
- 触ってはいけないデータ: プレイヤー名の保存（`localStorage`）はヘッドレスブラウザの使い捨てプロファイルに閉じるため，人間のブラウザには影響しない

## 待ち方・操作の癖 (Waiting & Selectors)

- 状態の判定はデバッグフックで行う（canvas 内は DOM から読めない）．`ctx.game.state()` でスナップショットを取り，`ctx.game.waitForState(条件)` でポーリングして待つ．固定時間の待機は最後の手段
- スナップショットの形（`game.state()` の戻り値）:
  - `app`: `scenePhase`（`"title"` / `"lobby"` / `"playing"` / `"result"`）・`myId`・`playerName`・`isJoining`・`isReconnecting`・`joinErrorMessage`・`connectionNoticeMessage`・`room`（`roomId`・`ownerId`・`status`・`maxPlayers`・`targetPlayerCount`・`fieldSizePreset`・`teamAssignmentMode`・`players[]`）・`gameResult`（`rankings[]`・`playerStats[]` 等）
  - `game`（ゲーム画面の表示中のみ．それ以外は `null`）: `remainingTimeSec`・`startCountdownSec`・`isInputEnabled`・`isBombEnabled`・`isFeverTime`・`teamPaintRates`（teamId 順の %）・`localBombHitCount`・`localPlayer`（`id`・`teamId`・`x`・`y`．グリッド単位）・`playerCount`（**参加人数ではない**．AOI により自分の周囲で同期されているプレイヤーの数．参加人数は `app.room.players` で確かめる）・`gameDurationSec`（今回の試合時間）・`gridCols`・`gridRows`
- 画面遷移はクライアント内の状態遷移で URL は変わらない．`game.waitForScene("lobby")` 等で待つ
- タイトル画面は「- TAP TO START -」を押すまで入力欄が出ない（`game.joinFromTitle()` が処理する）
- ゲーム開始はロビーの「ゲームスタート」→ 確認モーダルの「はい」．開始後 5 秒のカウントダウン（`GAME_START_DELAY_MS`）が明けるまで移動しない．`game.waitForGameplay()` で待つ
- 移動はキーボードではなく画面左半分のジョイスティック（ポインタ操作）だけで行う．`game.holdJoystick({ dirX, dirY, durationMs })` を使う．移動速度は 3 マス/秒
- 試合時間は既定 180 秒（`GAME_DURATION_SEC`）．開発モードの server に限り短縮でき（本番では無効．SPEC_03「試合時間の開発モード限定の上書き」），シナリオの `options.gameDurationSec` で確かめたい項目ごとに選ぶ
  - 短くしてよい（30 秒前後）: ロビー・開始・移動・塗り・リザルト表示等，時間経過そのものに依存しない確認．30 秒ならリザルトまで含めて 1 回 45 秒前後で終わる
  - 長めにする: 時間に依存する仕様を確かめる場合．しきい値は「残り時間」基準のため，120 秒以下では開始直後からハリケーンが出現し，60 秒以下ではフィーバータイム，30 秒以下では塗り率非表示（`???%`）が開始直後から有効になる．通常フェーズからフィーバーへの切り替わりを見るなら 70 秒以上，ハリケーン出現前の状態や「WARNING：ハリケーン出現」（残り 120 秒ちょうどで表示）を見るなら 130 秒以上，既定の通しを確認するなら指定しない（180 秒）
  - ランナーが server を起動した場合だけ適用される．人間が起動済みの server を使う場合は適用できず，ランナーは警告を出して（`result.json` の `warnings`・`gameDuration.status` = `not_applied_server_prestarted`）その server の試合時間のまま進める．実際の試合時間はスナップショットの `game.gameDurationSec`（`ctx.gameDuration` は想定値）で確認し，時間に依存する判定はこの値を基準に書く
  - デバッグフックの `remainingTimeSec` は切り捨ての整数のため，開始直後は指定値−1（30 秒の試合なら 29）になる．試合時間そのものは `gameDurationSec` で確かめる
  - フィーバーの開始バナー（「！Fever Time！」）は残り 60→59 秒に切り替わる瞬間にだけ表示されるため，60 秒以下の試合では表示されない（フィーバー自体は `isFeverTime` が開始直後から true になる）
  - `game.waitForResult()` の既定タイムアウトは，ゲーム中ならデバッグフックの残り時間＋カウントダウン＋30 秒から自動で決まる．固定値で待たない
- 参加者が目標人数（4 の倍数．最小 4）に満たない場合，server が自前の Bot（server 内部のもの）で不足分を補充する．ブラウザ 1 人＋ Bot 3 体なら補充は起きない
- 残り 120 秒からハリケーンが出現し，当たるとスタン（移動不可）・被弾数（`localBombHitCount`）が増える．短縮した試合では開始直後から出現するため，移動・塗りの判定は 1 回の移動で決めず，条件を満たすまで数回動かす（サンプルの書き方）
- ヘッドレスの既定画面は 1280×720（横長）．スマホ幅（`ctx.viewports.mobileLandscape`）で開く場合は，スマホではホーム画面起動以外を遮るゲートがあるため `game.openTitle({ query: "?allowBrowser=1" })` で開く．縦長の画面では「横画面にしてください」の表示に置き換わる
- セレクタは表示文言で指定する．推測で書かず，対象コンポーネント（`apps/client/src/scenes/` 配下）のソースで実際の文言を確認してから書く

## 既知のノイズ (Known Noise)

- 開発モードは React の StrictMode でエフェクトが 2 回実行される．ゲーム画面の初期化やソケット購読が一度張り直される挙動は不具合ではない
- ランナーが初めて client を起動したときは Vite の依存最適化で初回表示が遅い（数秒〜十数秒）．再実行で解消するなら不具合ではない
- ガードがブロックした通信は `net::ERR_BLOCKED_BY_CLIENT` のコンソールエラーとしても `problems` に記録される．`blockedRequests` に同じ URL があれば，それ自体は不具合ではない（ただし本番ホストへの通信が発生していたら報告する）
- server は `tsx watch` で起動するため，検証中に `packages/shared/dist` が書き換わる（`pnpm shared:build`・`pnpm typecheck`・`pnpm verify` の実行）と server が再起動し，進行中のルーム・試合が消えて Bot が切断される．検証の実行中にこれらを並行して実行しない（起きた場合は不具合ではなくシナリオを再実行する．`server.log` に `[tsx] change in ... Restarting...` が出る）
- このコンテナは `NODE_ENV=development` が設定されているため，コンテナ内で `pnpm --filter client build` すると React 等の開発版が同梱される（デバッグフックは mode で判定しているため含まれない）．検証結果とは無関係

## 禁止操作 (Prohibited Operations)

- 自分が起動していないプロセスの停止（人間が起動済みの server / client には触らない．ポート競合時も止めない）
- 「検証対象の環境」の拒否リストへのアクセス（ブラウザ・Bot・CLI・MCP 経由を含む）．Render の操作・`/deploy` の実行
- `docker compose -f docker-compose.prod.yml` 等の本番構成の起動・停止
- `.env` 系ファイル（`test/.env.local` 等）・`apps/client/vite.config.ts`・ゲーム定数（`packages/shared/src/config/gameConfig.ts`）の書き換え（試合時間の短縮は `options.gameDurationSec` で行う）
- 負荷テスト Bot（`test/` の `pnpm start`）の実行（99 体が接続し，人間の server に負荷を掛ける）
- `verify-` で始まらないルーム ID・プレイヤー名での参加

## シナリオのテンプレート (Scenario Template)

シナリオは `ctx` を受け取る async 関数を default export する ESM（`.mjs`）である．import は不要（必要なものは全て `ctx` にある）．以下はロビー参加 → Bot と対戦開始 → 移動して塗り率が増える → リザルト表示，を 30 秒の試合で確認するサンプルで，`scripts/verify/scenarios/sample-match.mjs` と同じ内容である（`pnpm verify:e2e scripts/verify/scenarios/sample-match.mjs` でそのまま動く．所要 45 秒前後）．試合時間を指定しない場合は `options` の行を削除する．

```js
/** ランナーへの指定（試合時間を短縮して高速化する．CLI の --game-duration-sec が優先） */
export const options = { gameDurationSec: 30 };

/**
 * @param {any} ctx ランナー（scripts/verify/run.mjs）が渡すコンテキスト
 */
export default async (ctx) => {
  const { page, check, assert, game, bots, note } = ctx;
  const roomId = ctx.roomId;
  const playerName = ctx.playerName("player");

  // ---- タイトル → ロビー ----
  await check("タイトル画面が表示されデバッグフックが公開されている", async () => {
    await game.openTitle();
    const snapshot = await game.state();
    assert(snapshot?.app?.scenePhase === "title", `scenePhase=${snapshot?.app?.scenePhase}`);
  });

  await check("名前とルーム ID を入力してロビーに入り，自分がオーナーになる", async () => {
    const snapshot = await game.joinFromTitle({ roomId, playerName });
    const room = snapshot.app?.room;
    assert(room?.roomId === roomId, `roomId=${room?.roomId}`);
    assert(room?.ownerId === snapshot.app?.myId, "オーナーが自分ではない");
  });

  // ---- Bot の参加 ----
  await check("Bot 3 体が参加しロビーの参加者が 4 人になる", async () => {
    await bots.join({ roomId, count: 3 });
    await game.waitForState((snapshot) => snapshot.app?.room?.players.length === 4, {
      description: "参加者が 4 人になる",
    });
    await page.getByText("参加プレイヤー (4/").waitFor();
  });

  // ---- 対戦開始 ----
  await check("ゲームスタートでゲーム画面に遷移し，カウントダウン後に操作可能になる", async () => {
    await game.startGameFromLobby();
    const snapshot = await game.waitForGameplay();
    assert(snapshot.game?.localPlayer?.teamId !== undefined, "自チームが取得できない");
    note(`自チーム teamId=${snapshot.game?.localPlayer?.teamId} / 同期中のプレイヤー数=${snapshot.game?.playerCount}`);
  });

  // ---- 移動と塗り率 ----
  await check("ジョイスティックで移動すると座標が変わり自チームの塗り率が増える", async () => {
    const before = await game.state();
    const beforeRate = game.myTeamPaintRate(before) ?? 0;
    const beforePos = before?.game?.localPlayer;
    assert(beforePos, "移動前の座標が取得できない");

    // 右 → 下 → 右 → 下へ順に移動して塗る（戻らない向きに限る）．短い試合ではハリケーンが
    // 最初から出るため，当たってスタンした場合に備えて条件を満たすまで最大 4 回動かす
    const directions = [
      { dirX: 1, dirY: 0 },
      { dirX: 0, dirY: 1 },
      { dirX: 1, dirY: 0 },
      { dirX: 0, dirY: 1 },
    ];
    const movedDistance = (snapshot) => {
      const position = snapshot.game?.localPlayer;
      return position ? Math.hypot(position.x - beforePos.x, position.y - beforePos.y) : 0;
    };
    let after = null;
    for (const direction of directions) {
      await game.holdJoystick({ ...direction, durationMs: 1500 });
      after = await game
        .waitForState(
          (snapshot) =>
            (game.myTeamPaintRate(snapshot) ?? 0) > beforeRate && movedDistance(snapshot) > 1,
          { timeoutMs: 2000, description: "1 マスより多く移動し自チームの塗り率が増える" },
        )
        .catch(() => null);
      if (after) break;
    }
    assert(after, "4 回移動しても，1 マスより多く移動して自チームの塗り率が増える状態にならない");
    const afterPos = after.game?.localPlayer;
    assert(afterPos, "移動後の座標が取得できない");
    const distance = Math.hypot(afterPos.x - beforePos.x, afterPos.y - beforePos.y);
    assert(distance > 1, `移動距離が小さすぎる（${distance.toFixed(2)} マス）`);
    note(
      `塗り率 ${beforeRate.toFixed(2)}% → ${(game.myTeamPaintRate(after) ?? 0).toFixed(2)}%，` +
        `移動 ${distance.toFixed(2)} マス，被弾 ${after.game?.localBombHitCount ?? 0} 回`,
    );
  });

  // ---- リザルト ----
  await check("制限時間が終わるとリザルト画面に順位が表示される", async () => {
    const snapshot = await game.waitForResult();
    const rankings = snapshot.app?.gameResult?.rankings ?? [];
    assert(rankings.length > 0, "順位が空");
    await page.getByText("結果発表").first().waitFor();
  });

  // ---- 画面を伴わないチェックの例（Bot 側の受信内容） ----
  await check(
    "Bot 全員がゲーム終了と結果を受信している",
    async () => {
      for (const bot of bots.list()) {
        await bot.waitFor((state) => state.result !== null, { description: "結果の受信" });
      }
    },
    { page: null },
  );
};
```

### ctx の一覧

| 名前 | 内容 |
| --- | --- |
| `page` | Playwright の Page（ガード付き Chromium．1280×720） |
| `browserContext` | Playwright の BrowserContext（`newPage()` で 2 人目のブラウザプレイヤーを作れる．問題の記録は 1 ページ目のみ） |
| `check(name, fn, options?)` | チェックを 1 件実行して記録する．`fn` が例外を投げたら FAIL として記録し，次へ進む．成否どちらでもスクリーンショットを残す．`options.page: null` または `options.screenshot: false` で画面を伴わないチェックになる．戻り値は PASS なら `true` |
| `assert(condition, message)` | 条件が偽なら例外を投げる（`check` 内の判定に使う） |
| `note(message)` | 判定ではない観測値を `result.json` の `notes` に残す |
| `screenshot(label, page?)` | 任意の時点のスクリーンショットを撮る |
| `roomId` | 実行ごとに一意な検証用ルーム ID（`verify-` 始まり） |
| `gameDuration` | 試合時間の扱い（`requestedSec`・`source`（`cli` / `scenario` / `null`）・`status`（`default` / `applied` / `not_applied_server_prestarted`）・`expectedSec`）．実際の値はスナップショットの `game.gameDurationSec` |
| `playerName(label?)` | 検証用プレイヤー名（`verify-<label>`）を返す |
| `game.openTitle({ query? })` | タイトル画面を開く（スマホ幅は `query: "?allowBrowser=1"`） |
| `game.joinFromTitle({ roomId, playerName })` | タイトルから入力してロビーへ入る（ロビー到達時のスナップショットを返す） |
| `game.startGameFromLobby()` | オーナーとして「ゲームスタート」→「はい」を押し，ゲーム画面を待つ |
| `game.waitForGameplay(options?)` | カウントダウンが明けて操作可能になるまで待つ（`isBombEnabled` が true になったことで判定する．`isInputEnabled` はカウントダウン中も true，`startCountdownSec` は時計の同期前に 0 を返すため，これらだけで開始を判定しない） |
| `game.holdJoystick({ dirX, dirY, durationMs })` | ジョイスティックを指定方向へ倒して保持する |
| `game.state()` | デバッグフックのスナップショット（未公開なら `null`） |
| `game.waitForState(predicate, { timeoutMs?, description? })` | 条件を満たすまでポーリングし，満たしたスナップショットを返す．タイムアウト時は最後の状態を添えて例外 |
| `game.waitForScene(phase, options?)` | 画面フェーズを待つ |
| `game.myTeamPaintRate(snapshot)` | 自チームの塗り率（%）を返す |
| `game.waitForResult(options?)` | リザルト表示を待つ（既定のタイムアウトは実際の残り時間から自動で決まる） |
| `game.getObservedGameDurationSec()` | デバッグフックから観測した実際の試合時間（ゲーム画面を観測する前は `null`） |
| `bots.join({ roomId, count?, namePrefix?, canMove?, timeoutMs? })` | Bot を参加させ，全員の参加確認まで待つ．既定は 3 体・ランダム移動あり・爆弾なし |
| `bots.list()` | 参加させた Bot の一覧．各 Bot は `state`（`id`・`isJoined`・`rejectedReason`・`teamId`・`isGameStarted`・`isGameEnded`・`moveCount`・`result`）・`startGame(payload?)`・`waitFor(predicate, options?)`・`disconnect()` を持つ |
| `viewports` | 画面サイズのプリセット（`desktop`・`mobileLandscape`） |
| `sleep(ms)` | 固定時間待つ（最後の手段） |

- 1 チェック = 「何がどうなるべきか」が分かる名前を付ける（スクリーンショットのファイル名にも使われる）
- 失敗しても次のチェックへ進む．前のチェックの結果に依存するチェックは，前提が満たされていない旨が分かるエラーメッセージにする
- 後始末（Bot の切断・ブラウザの終了・起動したプロセスの停止）はランナーが行うため，シナリオには書かない
