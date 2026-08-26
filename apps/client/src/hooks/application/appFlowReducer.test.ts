/**
 * appFlowReducer.test
 * アプリフロー状態遷移の現行挙動を固定する characterization test
 * 各アクションの更新範囲と未知アクション時の同一性を検証する
 * ロビー表示中は room が必ず存在するという画面遷移仕様の不変条件も検証する
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
      isConnectionLost: false,
      isProtocolMismatch: false,
    });
  });
});

describe("appFlowReducer", () => {
  it("connectionEstablished で myId を更新すること", () => {
    const next = appFlowReducer(createState(), {
      type: "connectionEstablished",
      myId: "socket-1",
    });

    expect(next.myId).toBe("socket-1");
  });

  it("connectionEstablished で scenePhase を変更しないこと", () => {
    const next = appFlowReducer(
      createState({ scenePhase: domain.app.ScenePhase.LOBBY }),
      { type: "connectionEstablished", myId: "socket-1" },
    );

    expect(next.scenePhase).toBe(domain.app.ScenePhase.LOBBY);
  });

  it("初回接続の connectionEstablished はプレイ中でもタイトルへ戻さないこと", () => {
    const next = appFlowReducer(
      createState({ scenePhase: domain.app.ScenePhase.PLAYING, myId: null }),
      { type: "connectionEstablished", myId: "socket-1" },
    );

    expect(next.scenePhase).toBe(domain.app.ScenePhase.PLAYING);
  });

  it("初回接続の connectionEstablished はロビーでもタイトルへ戻さないこと", () => {
    const next = appFlowReducer(
      createState({ scenePhase: domain.app.ScenePhase.LOBBY, myId: null }),
      { type: "connectionEstablished", myId: "socket-1" },
    );

    expect(next.scenePhase).toBe(domain.app.ScenePhase.LOBBY);
  });

  it("同じ myId の connectionEstablished はプレイ中のセッションを破棄しないこと", () => {
    const state = createState({
      scenePhase: domain.app.ScenePhase.PLAYING,
      room: createRoom(),
      myId: "socket-1",
      playerName: "たろう",
    });

    const next = appFlowReducer(state, {
      type: "connectionEstablished",
      myId: "socket-1",
    });

    expect(next).toEqual(state);
  });

  it("プレイ中に myId が変わった connectionEstablished でタイトルへ戻すこと", () => {
    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.PLAYING,
        room: createRoom(),
        myId: "socket-1",
      }),
      { type: "connectionEstablished", myId: "socket-2" },
    );

    expect(next.scenePhase).toBe(domain.app.ScenePhase.TITLE);
  });

  it("プレイ中に myId が変わった connectionEstablished で isConnectionLost を立てること", () => {
    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.PLAYING,
        room: createRoom(),
        myId: "socket-1",
      }),
      { type: "connectionEstablished", myId: "socket-2" },
    );

    expect(next.isConnectionLost).toBe(true);
  });

  it("プレイ中に myId が変わった connectionEstablished で新しい myId を採用すること", () => {
    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.PLAYING,
        room: createRoom(),
        myId: "socket-1",
      }),
      { type: "connectionEstablished", myId: "socket-2" },
    );

    expect(next.myId).toBe("socket-2");
  });

  it("プレイ中に myId が変わった connectionEstablished で room と gameResult を破棄すること", () => {
    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.PLAYING,
        room: createRoom(),
        gameResult: createGameResult(),
        myId: "socket-1",
      }),
      { type: "connectionEstablished", myId: "socket-2" },
    );

    expect({ room: next.room, gameResult: next.gameResult }).toEqual({
      room: null,
      gameResult: null,
    });
  });

  it("プレイ中に myId が変わった connectionEstablished で playerName を保持すること", () => {
    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.PLAYING,
        room: createRoom(),
        myId: "socket-1",
        playerName: "たろう",
      }),
      { type: "connectionEstablished", myId: "socket-2" },
    );

    expect(next.playerName).toBe("たろう");
  });

  it("ロビー中に myId が変わった connectionEstablished でタイトルへ戻すこと", () => {
    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.LOBBY,
        room: createRoom(),
        myId: "socket-1",
      }),
      { type: "connectionEstablished", myId: "socket-2" },
    );

    expect(next.scenePhase).toBe(domain.app.ScenePhase.TITLE);
  });

  it("リザルト表示中は myId が変わってもタイトルへ戻さないこと", () => {
    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.RESULT,
        gameResult: createGameResult(),
        myId: "socket-1",
      }),
      { type: "connectionEstablished", myId: "socket-2" },
    );

    expect(next.scenePhase).toBe(domain.app.ScenePhase.RESULT);
  });

  it("リザルト表示中に myId が変わった場合は myId のみ更新すること", () => {
    const state = createState({
      scenePhase: domain.app.ScenePhase.RESULT,
      gameResult: createGameResult(),
      myId: "socket-1",
    });

    const next = appFlowReducer(state, {
      type: "connectionEstablished",
      myId: "socket-2",
    });

    expect(next).toEqual({ ...state, myId: "socket-2" });
  });

  it("タイトル表示中は myId が変わってもタイトルのままであること", () => {
    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.TITLE,
        myId: "socket-1",
      }),
      { type: "connectionEstablished", myId: "socket-2" },
    );

    expect(next).toEqual(
      createState({
        scenePhase: domain.app.ScenePhase.TITLE,
        myId: "socket-2",
      }),
    );
  });

  it("プレイ中の connectionLost でタイトルへ戻すこと", () => {
    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.PLAYING,
        room: createRoom(),
        myId: "socket-1",
      }),
      { type: "connectionLost" },
    );

    expect(next.scenePhase).toBe(domain.app.ScenePhase.TITLE);
  });

  it("プレイ中の connectionLost で isConnectionLost を立てること", () => {
    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.PLAYING,
        room: createRoom(),
        myId: "socket-1",
      }),
      { type: "connectionLost" },
    );

    expect(next.isConnectionLost).toBe(true);
  });

  it("ロビー中の connectionLost でタイトルへ戻すこと", () => {
    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.LOBBY,
        room: createRoom(),
        myId: "socket-1",
      }),
      { type: "connectionLost" },
    );

    expect(next.scenePhase).toBe(domain.app.ScenePhase.TITLE);
  });

  it("connectionLost でセッションを破棄しても playerName を保持すること", () => {
    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.PLAYING,
        room: createRoom(),
        myId: "socket-1",
        playerName: "たろう",
      }),
      { type: "connectionLost" },
    );

    expect(next.playerName).toBe("たろう");
  });

  it("connectionLost でセッションを破棄したとき myId を消去すること", () => {
    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.PLAYING,
        room: createRoom(),
        myId: "socket-1",
      }),
      { type: "connectionLost" },
    );

    expect(next.myId).toBeNull();
  });

  it("リザルト表示中の connectionLost では同一の状態参照を返すこと", () => {
    const state = createState({
      scenePhase: domain.app.ScenePhase.RESULT,
      gameResult: createGameResult(),
      myId: "socket-1",
    });

    const next = appFlowReducer(state, { type: "connectionLost" });

    expect(next).toBe(state);
  });

  it("タイトル表示中の connectionLost では同一の状態参照を返すこと", () => {
    const state = createState({
      scenePhase: domain.app.ScenePhase.TITLE,
      myId: "socket-1",
    });

    const next = appFlowReducer(state, { type: "connectionLost" });

    expect(next).toBe(state);
  });

  it("clearConnectionNotice で isConnectionLost を下ろすこと", () => {
    const next = appFlowReducer(createState({ isConnectionLost: true }), {
      type: "clearConnectionNotice",
    });

    expect(next.isConnectionLost).toBe(false);
  });

  it("clearConnectionNotice で isConnectionLost 以外を変更しないこと", () => {
    const state = createState({
      scenePhase: domain.app.ScenePhase.TITLE,
      myId: "socket-1",
      playerName: "たろう",
      isConnectionLost: true,
    });

    const next = appFlowReducer(state, { type: "clearConnectionNotice" });

    expect(next).toEqual({ ...state, isConnectionLost: false });
  });

  it("resetToTitle で isConnectionLost を下ろすこと", () => {
    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.PLAYING,
        room: createRoom(),
        myId: "socket-1",
        isConnectionLost: true,
      }),
      { type: "resetToTitle", clearMyId: true },
    );

    expect(next.isConnectionLost).toBe(false);
  });

  it("protocolVersionMismatch で isProtocolMismatch を立てること", () => {
    const next = appFlowReducer(createState(), {
      type: "protocolVersionMismatch",
    });

    expect(next.isProtocolMismatch).toBe(true);
  });

  it("protocolVersionMismatch で playerName を保持すること", () => {
    const next = appFlowReducer(createState({ playerName: "たろう" }), {
      type: "protocolVersionMismatch",
    });

    expect(next.playerName).toBe("たろう");
  });

  it("protocolVersionMismatch で isProtocolMismatch 以外を変更しないこと", () => {
    const state = createState({
      scenePhase: domain.app.ScenePhase.TITLE,
      myId: "socket-1",
      playerName: "たろう",
      isConnectionLost: true,
    });

    const next = appFlowReducer(state, { type: "protocolVersionMismatch" });

    expect(next).toEqual({ ...state, isProtocolMismatch: true });
  });

  it("protocolVersionMismatch を繰り返してもフラグが立ったままであること", () => {
    const first = appFlowReducer(createState(), {
      type: "protocolVersionMismatch",
    });
    const second = appFlowReducer(first, { type: "protocolVersionMismatch" });

    expect(second.isProtocolMismatch).toBe(true);
  });

  it("resetToTitle で isProtocolMismatch を保持すること", () => {
    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.RESULT,
        gameResult: createGameResult(),
        isProtocolMismatch: true,
      }),
      { type: "resetToTitle", clearMyId: true },
    );

    expect(next.isProtocolMismatch).toBe(true);
  });

  it("clearConnectionNotice で isProtocolMismatch を下ろさないこと", () => {
    const next = appFlowReducer(
      createState({ isConnectionLost: true, isProtocolMismatch: true }),
      { type: "clearConnectionNotice" },
    );

    expect(next.isProtocolMismatch).toBe(true);
  });

  it("connectionLost でセッションを破棄しても isProtocolMismatch を保持すること", () => {
    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.PLAYING,
        room: createRoom(),
        myId: "socket-1",
        isProtocolMismatch: true,
      }),
      { type: "connectionLost" },
    );

    expect(next.isProtocolMismatch).toBe(true);
  });

  it("myId が変わった connectionEstablished でも isProtocolMismatch を保持すること", () => {
    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.LOBBY,
        room: createRoom(),
        myId: "socket-1",
        isProtocolMismatch: true,
      }),
      { type: "connectionEstablished", myId: "socket-2" },
    );

    expect(next.isProtocolMismatch).toBe(true);
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
      isConnectionLost: false,
      isProtocolMismatch: false,
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

    const next = appFlowReducer(state, {
      type: "connectionEstablished",
      myId: "socket-1",
    });

    expect(next).not.toBe(state);
  });

  it("既知のアクションで元の状態を破壊的に変更しないこと", () => {
    const state = createState({ myId: "socket-1" });

    appFlowReducer(state, { type: "connectionEstablished", myId: "socket-2" });

    expect(state.myId).toBe("socket-1");
  });

  it("ロビー中の connectionLost で room を破棄すること", () => {
    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.LOBBY,
        room: createRoom(),
        myId: "socket-1",
      }),
      { type: "connectionLost" },
    );

    expect(next.room).toBeNull();
  });

  it("ロビー中の resetToTitle で room を破棄すること", () => {
    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.LOBBY,
        room: createRoom(),
        myId: "socket-1",
      }),
      { type: "resetToTitle", clearMyId: true },
    );

    expect(next.room).toBeNull();
  });

  it("setRoomAndLobby でロビーへ遷移したとき room が設定済みであること", () => {
    const next = appFlowReducer(createState(), {
      type: "setRoomAndLobby",
      room: createRoom(),
    });

    expect(next.scenePhase).toBe(domain.app.ScenePhase.LOBBY);
    expect(next.room).not.toBeNull();
  });

  it("ロビー中の updateRoom 後も room が設定済みのままであること", () => {
    const next = appFlowReducer(
      createState({
        scenePhase: domain.app.ScenePhase.LOBBY,
        room: createRoom("room-1"),
      }),
      { type: "updateRoom", room: createRoom("room-2") },
    );

    expect(next.room).not.toBeNull();
  });

  it("どのアクションを適用してもロビー表示中に room が null にならないこと", () => {
    // 画面遷移仕様（SPEC_01）上，ロビー表示はルーム受信後にのみ成立する
    const states: AppFlowData[] = [
      createState(),
      createState({ scenePhase: domain.app.ScenePhase.TITLE, myId: "socket-1" }),
      createState({
        scenePhase: domain.app.ScenePhase.LOBBY,
        room: createRoom(),
        myId: "socket-1",
      }),
      createState({
        scenePhase: domain.app.ScenePhase.PLAYING,
        room: createRoom(),
        myId: "socket-1",
      }),
      createState({
        scenePhase: domain.app.ScenePhase.RESULT,
        gameResult: createGameResult(),
        myId: "socket-1",
      }),
    ];
    const actions: AppFlowAction[] = [
      { type: "connectionEstablished", myId: "socket-1" },
      { type: "connectionEstablished", myId: "socket-2" },
      { type: "connectionLost" },
      { type: "clearConnectionNotice" },
      { type: "protocolVersionMismatch" },
      { type: "setPlayerName", playerName: "たろう" },
      { type: "setRoomAndLobby", room: createRoom("room-2") },
      { type: "updateRoom", room: createRoom("room-3") },
      { type: "setPlaying" },
      { type: "setResult", result: createGameResult() },
      { type: "resetToTitle", clearMyId: false },
      { type: "resetToTitle", clearMyId: true },
    ];

    // ロビーでありながら room を持たない結果状態を洗い出す
    const violations = states.flatMap((state) =>
      actions
        .map((action) => ({ action, next: appFlowReducer(state, action) }))
        .filter(
          ({ next }) =>
            next.scenePhase === domain.app.ScenePhase.LOBBY &&
            next.room === null,
        )
        .map(({ action }) => action.type),
    );

    expect(violations).toEqual([]);
  });
});
