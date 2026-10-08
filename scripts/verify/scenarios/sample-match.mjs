/**
 * sample-match
 * シナリオのテンプレート兼スモークテスト
 * ロビー参加 → Bot と対戦開始 → 移動して自チームの塗り率が増える → リザルト表示，を一通り確認する
 *
 *   pnpm verify:e2e scripts/verify/scenarios/sample-match.mjs
 *
 * 試合時間は options.gameDurationSec で 30 秒に短縮する（ランナーが server を起動する場合のみ有効）
 * 30 秒の試合は開始時点で残り 60 秒以下・120 秒以下のため，フィーバータイムとハリケーンが最初から有効になる
 */

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
