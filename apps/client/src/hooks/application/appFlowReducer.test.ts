/**
 * appFlowReducer.test
 * アプリフロー状態遷移の現行挙動を固定する characterization test
 * 各アクションの更新範囲と未知アクション時の同一性を検証する
 */
import { describe, expect, it } from "vitest";

import { domain } from "@repo/shared";
import type { GameResultPayload } from "@repo/shared";

import type { AppFlowAction, AppFlowData } from "../types/appFlowState";
import { appFlowReducer, initialAppFlowData } from "./appFlowReducer";

/** テスト用のルームを生成する */
const createRoom = (roomId = "room-1"): domain.room.Room => {
  return {
    roomId,
    ownerId: "owner-1",
    players: [],
    status: "waiting",
    maxPlayers: 8,
    fieldSizePreset: "MEDIUM",
    teamAssignmentMode: "random",
  };
};

/** テスト用のゲーム結果を生成する */
const createGameResult = (): GameResultPayload => {
  return {
    rankings: [{ rank: 1, teamId: 0, teamName: "Red", paintRate: 0.5 }],
  };
};

/** テスト用の任意状態を生成する */
const createState = (overrides: Partial<AppFlowData> = {}): AppFlowData => {
  return {
    ...initialAppFlowData,
    ...overrides,
  };
};

describe("initialAppFlowData", () => {
  it("初期状態がタイトル画面で各データ未設定であること", () => {
    expect(initialAppFlowData).toEqual({
      scenePhase: domain.app.ScenePhase.TITLE,
      room: null,
      myId: null,
      gameResult: null,
      playerName: "",
    });
  });
});

describe("appFlowReducer", () => {
  it("setMyId で myId を更新すること", () => {
    const next = appFlowReducer(createState(), {
      type: "setMyId",
      myId: "socket-1",
    });

    expect(next.myId).toBe("socket-1");
  });

  it("setMyId で null を指定した場合は myId を null にすること", () => {
    const next = appFlowReducer(createState({ myId: "socket-1" }), {
      type: "setMyId",
      myId: null,
    });

    expect(next.myId).toBeNull();
  });

  it("setMyId で scenePhase を変更しないこと", () => {
    const next = appFlowReducer(
      createState({ scenePhase: domain.app.ScenePhase.LOBBY }),
      { type: "setMyId", myId: "socket-1" },
    );

    expect(next.scenePhase).toBe(domain.app.ScenePhase.LOBBY);
  });

  it("setPlayerName で playerName を更新すること", () => {
    const next = appFlowReducer(createState(), {
      type: "setPlayerName",
      playerName: "たろう",
    });

    expect(next.playerName).toBe("たろう");
  });

  it("setPlayerName で空文字を指定した場合はそのまま空文字を保持すること", () => {
    const next = appFlowReducer(createState({ playerName: "たろう" }), {
      type: "setPlayerName",
      playerName: "",
    });

    expect(next.playerName).toBe("");
  });

  it("setRoomAndLobby でルームを設定しロビーへ遷移すること", () => {
    const room = createRoom();

    const next = appFlowReducer(createState(), {
      type: "setRoomAndLobby",
      room,
    });

    expect(next).toEqual({
      ...createState(),
      room,
      scenePhase: domain.app.ScenePhase.LOBBY,
    });
  });

  it("setRoomAndLobby でルーム参照をそのまま保持すること", () => {
    const room = createRoom();

    const next = appFlowReducer(createState(), {
      type: "setRoomAndLobby",
      room,
    });

    expect(next.room).toBe(room);
  });

  it("setRoomAndLobby はリザルト表示中でもロビーへ戻すこと", () => {
    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.RESULT,
        gameResult: createGameResult(),
      }),
      { type: "setRoomAndLobby", room: createRoom() },
    );

    expect(next.scenePhase).toBe(domain.app.ScenePhase.LOBBY);
  });

  it("setRoomAndLobby は前ゲームの gameResult を破棄すること", () => {
    const next = appFlowReducer(createState({ gameResult: createGameResult() }), {
      type: "setRoomAndLobby",
      room: createRoom(),
    });

    expect(next.gameResult).toBeNull();
  });

  it("setRoomAndLobby はリザルト表示からの復帰でも gameResult を破棄すること", () => {
    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.RESULT,
        gameResult: createGameResult(),
      }),
      { type: "setRoomAndLobby", room: createRoom() },
    );

    expect(next.gameResult).toBeNull();
  });

  it("updateRoom でルームのみを更新すること", () => {
    const room = createRoom("room-2");

    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.LOBBY,
        room: createRoom("room-1"),
      }),
      { type: "updateRoom", room },
    );

    expect(next.room).toBe(room);
  });

  it("updateRoom で scenePhase を変更しないこと", () => {
    const next = appFlowReducer(
      createState({ scenePhase: domain.app.ScenePhase.PLAYING }),
      { type: "updateRoom", room: createRoom() },
    );

    expect(next.scenePhase).toBe(domain.app.ScenePhase.PLAYING);
  });

  it("setPlaying でプレイ中へ遷移し gameResult を消去すること", () => {
    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.RESULT,
        gameResult: createGameResult(),
      }),
      { type: "setPlaying" },
    );

    expect(next).toEqual(
      createState({
        scenePhase: domain.app.ScenePhase.PLAYING,
        gameResult: null,
      }),
    );
  });

  it("setPlaying でルームと myId を保持すること", () => {
    const room = createRoom();

    const next = appFlowReducer(
      createState({ room, myId: "socket-1", playerName: "たろう" }),
      { type: "setPlaying" },
    );

    expect({
      room: next.room,
      myId: next.myId,
      playerName: next.playerName,
    }).toEqual({ room, myId: "socket-1", playerName: "たろう" });
  });

  it("setResult で結果を設定しリザルトへ遷移すること", () => {
    const result = createGameResult();

    const next = appFlowReducer(
      createState({ scenePhase: domain.app.ScenePhase.PLAYING }),
      { type: "setResult", result },
    );

    expect(next).toEqual(
      createState({
        scenePhase: domain.app.ScenePhase.RESULT,
        gameResult: result,
      }),
    );
  });

  it("setResult で結果参照をそのまま保持すること", () => {
    const result = createGameResult();

    const next = appFlowReducer(createState(), { type: "setResult", result });

    expect(next.gameResult).toBe(result);
  });

  it("resetToTitle でタイトルへ戻しルームと結果を消去すること", () => {
    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.RESULT,
        room: createRoom(),
        gameResult: createGameResult(),
        myId: "socket-1",
        playerName: "たろう",
      }),
      { type: "resetToTitle", clearMyId: false },
    );

    expect(next).toEqual({
      scenePhase: domain.app.ScenePhase.TITLE,
      room: null,
      myId: "socket-1",
      gameResult: null,
      playerName: "たろう",
    });
  });

  it("resetToTitle で clearMyId が true の場合は myId を消去すること", () => {
    const next = appFlowReducer(createState({ myId: "socket-1" }), {
      type: "resetToTitle",
      clearMyId: true,
    });

    expect(next.myId).toBeNull();
  });

  it("resetToTitle で playerName を保持すること", () => {
    const next = appFlowReducer(createState({ playerName: "たろう" }), {
      type: "resetToTitle",
      clearMyId: true,
    });

    expect(next.playerName).toBe("たろう");
  });

  it("未知のアクションでは同一の状態参照を返すこと", () => {
    const state = createState({ myId: "socket-1" });

    const next = appFlowReducer(state, { type: "unknown" } as unknown as AppFlowAction);

    expect(next).toBe(state);
  });

  it("既知のアクションでは新しいオブジェクトを返すこと", () => {
    const state = createState();

    const next = appFlowReducer(state, { type: "setMyId", myId: "socket-1" });

    expect(next).not.toBe(state);
  });

  it("既知のアクションで元の状態を破壊的に変更しないこと", () => {
    const state = createState({ myId: "socket-1" });

    appFlowReducer(state, { type: "setMyId", myId: "socket-2" });

    expect(state.myId).toBe("socket-1");
  });
});
