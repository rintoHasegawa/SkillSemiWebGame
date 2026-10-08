/**
 * game
 * Pixel Paint War の画面操作とデバッグフック（読み取り専用のゲーム状態）の参照をまとめたヘルパー
 * 操作は実際の UI（ボタン・ジョイスティック）を通して行い，判定はデバッグフックのスナップショットで行う
 */
import { config as sharedConfig } from "@repo/shared";

import { CLIENT_URL } from "./guard.mjs";
import { readDebugHookKey } from "./debugHookKey.mjs";

const DEFAULT_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 200;
/** ゲーム開始カウントダウン（GAME_START_DELAY_MS）の秒数 */
const START_DELAY_SEC = sharedConfig.GAME_CONFIG.GAME_START_DELAY_MS / 1000;
/** リザルト待ちで試合の残り時間に足す余裕（秒） */
const RESULT_WAIT_MARGIN_SEC = 30;
/** ジョイスティックを倒す距離（px）．最大半径（60px）を超えて倒し切る */
const JOYSTICK_DRAG_PX = 80;

/**
 * @typedef {{
 *   schemaVersion: number,
 *   capturedAtMs: number,
 *   app: null | {
 *     scenePhase: "title" | "lobby" | "playing" | "result",
 *     myId: string | null,
 *     playerName: string,
 *     isJoining: boolean,
 *     isReconnecting: boolean,
 *     joinErrorMessage: string | null,
 *     connectionNoticeMessage: string | null,
 *     room: null | {
 *       roomId: string, ownerId: string, status: string, maxPlayers: number,
 *       targetPlayerCount: number | null, fieldSizePreset: string, teamAssignmentMode: string,
 *       players: { id: string, name: string, isOwner: boolean, preferredTeamId: number | null }[],
 *     },
 *     gameResult: import("@repo/shared").GameResultPayload | null,
 *   },
 *   game: null | {
 *     remainingTimeSec: number, startCountdownSec: number,
 *     isInputEnabled: boolean, isBombEnabled: boolean, isFeverTime: boolean,
 *     teamPaintRates: number[], localBombHitCount: number,
 *     localPlayer: null | { id: string, teamId: number, x: number, y: number },
 *     playerCount: number, gameDurationSec: number, gridCols: number, gridRows: number,
 *   },
 * }} DebugSnapshot
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * ページに結び付いたゲーム操作ヘルパーを生成する
 * @param {import("playwright").Page} page
 * @param {{ expectedGameDurationSec: number }} options 想定の試合時間（ゲーム画面を観測する前の待ち時間の見積もりに使う）
 */
export const createGameHelpers = (page, { expectedGameDurationSec }) => {
  const debugHookKey = readDebugHookKey();
  /** @type {number | null} デバッグフックから観測した実際の試合時間（秒） */
  let observedGameDurationSec = null;

  /**
   * デバッグフックのスナップショットを返す（フック未公開なら null）
   * @returns {Promise<DebugSnapshot | null>}
   */
  const state = async () => {
    const snapshot = await page.evaluate((key) => {
      const hook = Reflect.get(window, key);
      if (!hook || typeof hook !== "object" || typeof hook.getSnapshot !== "function") {
        return null;
      }
      return /** @type {unknown} */ (hook.getSnapshot());
    }, debugHookKey);
    const typed = /** @type {DebugSnapshot | null} */ (snapshot);
    if (typed?.game) {
      observedGameDurationSec = typed.game.gameDurationSec;
    }
    return typed;
  };

  /**
   * スナップショットが条件を満たすまで待ち，満たした時点のスナップショットを返す
   * @param {(snapshot: DebugSnapshot) => boolean} predicate
   * @param {{ timeoutMs?: number, description?: string }} [options]
   * @returns {Promise<DebugSnapshot>}
   */
  const waitForState = async (predicate, options = {}) => {
    const { timeoutMs = DEFAULT_TIMEOUT_MS, description = "条件" } = options;
    const deadline = Date.now() + timeoutMs;
    /** @type {DebugSnapshot | null} */
    let last = null;
    for (;;) {
      last = await state();
      if (last && predicate(last)) {
        return last;
      }
      if (Date.now() > deadline) {
        const summary = last
          ? JSON.stringify({ scene: last.app?.scenePhase, game: last.game && { ...last.game } })
          : "デバッグフック未公開（開発モードの client か確認）";
        throw new Error(`${timeoutMs}ms 待っても満たされませんでした: ${description}．最後の状態: ${summary}`);
      }
      await sleep(POLL_INTERVAL_MS);
    }
  };

  /**
   * 画面フェーズが指定値になるまで待つ
   * @param {"title" | "lobby" | "playing" | "result"} scenePhase
   * @param {{ timeoutMs?: number }} [options]
   */
  const waitForScene = (scenePhase, options = {}) => {
    return waitForState((snapshot) => snapshot.app?.scenePhase === scenePhase, {
      ...options,
      description: `画面が ${scenePhase} になる`,
    });
  };

  /**
   * タイトル画面を開く（query は ?allowBrowser=1 等）
   * @param {{ query?: string }} [options]
   */
  const openTitle = async ({ query = "" } = {}) => {
    await page.goto(`${CLIENT_URL}/${query}`);
    await waitForScene("title");
  };

  /**
   * タイトル画面から名前とルーム ID を入力してロビーへ入る
   * @param {{ roomId: string, playerName: string }} params
   */
  const joinFromTitle = async ({ roomId, playerName }) => {
    if (!roomId.startsWith("verify-") || !playerName.startsWith("verify-")) {
      throw new Error("ルーム ID・プレイヤー名は verify- で始めてください");
    }
    await page.getByText("- TAP TO START -").click();
    await page.getByPlaceholder("プレイヤー名を入力").fill(playerName);
    await page.getByPlaceholder("ルームIDを入力").fill(roomId);
    await page.getByRole("button", { name: "GAME START" }).click();
    return waitForScene("lobby");
  };

  /** ロビー（オーナー）で「ゲームスタート」→ 確認モーダルの「はい」を押す */
  const startGameFromLobby = async () => {
    await page.getByRole("button", { name: "ゲームスタート" }).click();
    await page.getByRole("button", { name: "はい" }).click();
    return waitForScene("playing");
  };

  /**
   * 開始カウントダウンが明けて操作できるようになるまで待つ
   * isInputEnabled はカウントダウン中も true，startCountdownSec は時計の同期前に 0 を返すため，
   * 開始前は false になる isBombEnabled（入力をゲームへ反映できるか）で開始を判定する
   */
  const waitForGameplay = (options = {}) => {
    return waitForState(
      (snapshot) =>
        snapshot.game !== null &&
        snapshot.game.isBombEnabled &&
        snapshot.game.startCountdownSec <= 0 &&
        snapshot.game.isInputEnabled &&
        snapshot.game.localPlayer !== null,
      { timeoutMs: 30_000, ...options, description: "カウントダウンが明けて操作可能になる" },
    );
  };

  /**
   * 画面左半分のジョイスティックを指定方向へ倒して一定時間保持する
   * @param {{ dirX: number, dirY: number, durationMs: number }} params dirX / dirY は向き（正規化不要）
   */
  const holdJoystick = async ({ dirX, dirY, durationMs }) => {
    const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
    const startX = viewport.width * 0.25;
    const startY = viewport.height * 0.5;
    const length = Math.hypot(dirX, dirY) || 1;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(
      startX + (dirX / length) * JOYSTICK_DRAG_PX,
      startY + (dirY / length) * JOYSTICK_DRAG_PX,
      { steps: 5 },
    );
    await page.waitForTimeout(durationMs);
    await page.mouse.up();
  };

  /**
   * ローカルプレイヤーのチームの塗り率（%）を返す（ゲーム外なら null）
   * @param {DebugSnapshot | null} snapshot
   */
  const myTeamPaintRate = (snapshot) => {
    const teamId = snapshot?.game?.localPlayer?.teamId;
    if (teamId === undefined || teamId === null || !snapshot?.game) {
      return null;
    }
    return snapshot.game.teamPaintRates[teamId] ?? null;
  };

  /**
   * リザルト画面になるまで待つ
   * 既定のタイムアウトは，ゲーム中なら実際の残り時間（デバッグフック），
   * ゲーム前なら想定の試合時間に，開始待ちと余裕を足して決める
   * @param {{ timeoutMs?: number }} [options]
   */
  const waitForResult = async (options = {}) => {
    let { timeoutMs } = options;
    if (timeoutMs === undefined) {
      const current = await state();
      const remainingSec = current?.game
        ? current.game.remainingTimeSec + current.game.startCountdownSec
        : (observedGameDurationSec ?? expectedGameDurationSec) + START_DELAY_SEC;
      timeoutMs = (remainingSec + RESULT_WAIT_MARGIN_SEC) * 1000;
    }
    return waitForState(
      (snapshot) => snapshot.app?.scenePhase === "result" && snapshot.app.gameResult !== null,
      { timeoutMs, description: "リザルト画面に結果が表示される" },
    );
  };

  /** デバッグフックから観測した実際の試合時間（秒）．ゲーム画面を一度も観測していなければ null */
  const getObservedGameDurationSec = () => observedGameDurationSec;

  return {
    state,
    waitForState,
    waitForScene,
    openTitle,
    joinFromTitle,
    startGameFromLobby,
    waitForGameplay,
    holdJoystick,
    myTeamPaintRate,
    waitForResult,
    getObservedGameDurationSec,
  };
};
