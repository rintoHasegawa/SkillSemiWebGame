/**
 * PlayerSyncHandler.test
 * プレイヤー同期イベント適用の現行挙動を固定する characterization test
 * 生成種別の分岐・自分自身の除外・再生成と削除の副作用を検証する
 */
import { Container } from "pixi.js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppearanceResolver } from "@client/scenes/game/application/AppearanceResolver";
import {
  LocalPlayerController,
  RemotePlayerController,
} from "@client/scenes/game/entities/player/PlayerController";
import { PlayerRepository } from "@client/scenes/game/entities/player/PlayerRepository";
import { PlayerSyncHandler } from "./PlayerSyncHandler";

/** 呼び出し記録付きのワールドコンテナスタブを生成する */
const createWorldContainerStub = () => {
  const addedChildren: unknown[] = [];
  const removedChildren: unknown[] = [];

  const worldContainer = {
    addChild: (child: unknown) => {
      addedChildren.push(child);
      return child;
    },
    removeChild: (child: unknown) => {
      removedChildren.push(child);
      return child;
    },
  } as unknown as Container;

  return { worldContainer, addedChildren, removedChildren };
};

/** テスト対象のハンドラ一式を生成する */
const createHandler = (myId = "me") => {
  const { worldContainer, addedChildren, removedChildren } =
    createWorldContainerStub();
  const playerRepository = new PlayerRepository();

  const handler = new PlayerSyncHandler({
    worldContainer,
    playerRepository,
    myId,
    appearanceResolver: new AppearanceResolver(),
  });

  return { handler, playerRepository, addedChildren, removedChildren };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PlayerSyncHandler", () => {
  it("新規参加プレイヤーをリポジトリへ登録すること", () => {
    const { handler, playerRepository } = createHandler();

    handler.handleNewPlayer({ id: "p1", name: "たろう", teamId: 1, x: 10, y: 20 });

    expect(playerRepository.getById("p1")).toBeDefined();
  });

  it("新規参加プレイヤーの描画オブジェクトをワールドへ追加すること", () => {
    const { handler, playerRepository, addedChildren } = createHandler();

    handler.handleNewPlayer({ id: "p1", name: "たろう", teamId: 1, x: 10, y: 20 });

    expect(addedChildren).toEqual([
      playerRepository.getById("p1")?.getDisplayObject(),
    ]);
  });

  it("自分自身はローカルプレイヤーとして生成すること", () => {
    const { handler, playerRepository } = createHandler("me");

    handler.handleNewPlayer({ id: "me", name: "自分", teamId: 0, x: 1, y: 2 });

    expect(playerRepository.getById("me")).toBeInstanceOf(LocalPlayerController);
  });

  it("他プレイヤーはリモートプレイヤーとして生成すること", () => {
    const { handler, playerRepository } = createHandler("me");

    handler.handleNewPlayer({ id: "p1", name: "他人", teamId: 1, x: 1, y: 2 });

    expect(playerRepository.getById("p1")).toBeInstanceOf(
      RemotePlayerController,
    );
  });

  it("生成したプレイヤーへ初期座標を反映すること", () => {
    const { handler, playerRepository } = createHandler();

    handler.handleNewPlayer({ id: "p1", name: "たろう", teamId: 1, x: 10, y: 20 });

    expect(playerRepository.getById("p1")?.getPosition()).toEqual({
      x: 10,
      y: 20,
    });
  });

  it("既存IDの再受信では既存コントローラーを破棄すること", () => {
    const { handler, playerRepository } = createHandler();
    handler.handleNewPlayer({ id: "p1", name: "たろう", teamId: 1, x: 1, y: 2 });
    const previous = playerRepository.getById("p1");
    const destroySpy = vi.spyOn(
      previous as RemotePlayerController,
      "destroy",
    );

    handler.handleNewPlayer({ id: "p1", name: "たろう", teamId: 1, x: 3, y: 4 });

    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it("既存IDの再受信では新しいコントローラーへ差し替えること", () => {
    const { handler, playerRepository } = createHandler();
    handler.handleNewPlayer({ id: "p1", name: "たろう", teamId: 1, x: 1, y: 2 });
    const previous = playerRepository.getById("p1");

    handler.handleNewPlayer({ id: "p1", name: "たろう", teamId: 1, x: 3, y: 4 });

    expect(playerRepository.getById("p1")).not.toBe(previous);
  });

  it("既存IDの再受信では既存の描画オブジェクトをワールドから除去すること", () => {
    const { handler, playerRepository, removedChildren } = createHandler();
    handler.handleNewPlayer({ id: "p1", name: "たろう", teamId: 1, x: 1, y: 2 });
    const previousDisplayObject = playerRepository
      .getById("p1")
      ?.getDisplayObject();

    handler.handleNewPlayer({ id: "p1", name: "たろう", teamId: 1, x: 3, y: 4 });

    expect(removedChildren).toEqual([previousDisplayObject]);
  });

  it("初期プレイヤー一覧のうち座標を持つ要素を生成すること", () => {
    const { handler, playerRepository } = createHandler();

    handler.handleCurrentPlayers([
      { id: "p1", name: "たろう", teamId: 1, x: 10, y: 20 },
    ]);

    expect(playerRepository.getById("p1")).toBeDefined();
  });

  it("初期プレイヤー一覧のうち座標を持たない要素は生成しないこと", () => {
    const { handler, playerRepository } = createHandler();

    handler.handleCurrentPlayers([{ id: "p1", name: "たろう", teamId: 1 }]);

    expect(playerRepository.getById("p1")).toBeUndefined();
  });

  it("初期プレイヤー一覧の座標なし要素があっても他要素は生成すること", () => {
    const { handler, playerRepository } = createHandler();

    handler.handleCurrentPlayers([
      { id: "p1", name: "たろう", teamId: 1 },
      { id: "p2", name: "はなこ", teamId: 2, x: 5, y: 6 },
    ]);

    expect(playerRepository.getById("p2")).toBeDefined();
  });

  it("初期プレイヤー一覧が空の場合は何も生成しないこと", () => {
    const { handler, playerRepository } = createHandler();

    handler.handleCurrentPlayers([]);

    expect(playerRepository.values()).toEqual([]);
  });

  it("差分更新をリモートプレイヤーへ適用すること", () => {
    const { handler, playerRepository } = createHandler("me");
    handler.handleNewPlayer({ id: "p1", name: "他人", teamId: 1, x: 1, y: 2 });
    const target = playerRepository.getById("p1") as RemotePlayerController;
    const applySpy = vi.spyOn(target, "applyRemoteUpdate");

    handler.handlePlayerUpdates([{ id: "p1", x: 30, y: 40 }]);

    expect(applySpy).toHaveBeenCalledWith({ x: 30, y: 40 });
  });

  it("差分更新では自分自身を対象外とすること", () => {
    const { handler, playerRepository } = createHandler("me");
    handler.handleNewPlayer({ id: "me", name: "自分", teamId: 0, x: 1, y: 2 });

    handler.handlePlayerUpdates([{ id: "me", x: 30, y: 40 }]);

    expect(playerRepository.getById("me")?.getPosition()).toEqual({
      x: 1,
      y: 2,
    });
  });

  it("差分更新で未登録IDを指定しても例外を投げないこと", () => {
    const { handler } = createHandler();

    expect(() =>
      handler.handlePlayerUpdates([{ id: "unknown", x: 1, y: 2 }]),
    ).not.toThrow();
  });

  it("差分更新は複数要素をすべて適用すること", () => {
    const { handler, playerRepository } = createHandler("me");
    handler.handleNewPlayer({ id: "p1", name: "A", teamId: 1, x: 1, y: 2 });
    handler.handleNewPlayer({ id: "p2", name: "B", teamId: 2, x: 3, y: 4 });
    const firstSpy = vi.spyOn(
      playerRepository.getById("p1") as RemotePlayerController,
      "applyRemoteUpdate",
    );
    const secondSpy = vi.spyOn(
      playerRepository.getById("p2") as RemotePlayerController,
      "applyRemoteUpdate",
    );

    handler.handlePlayerUpdates([
      { id: "p1", x: 10, y: 20 },
      { id: "p2", x: 30, y: 40 },
    ]);

    expect([firstSpy.mock.calls.length, secondSpy.mock.calls.length]).toEqual([
      1, 1,
    ]);
  });

  it("退出プレイヤーをリポジトリから削除すること", () => {
    const { handler, playerRepository } = createHandler();
    handler.handleNewPlayer({ id: "p1", name: "たろう", teamId: 1, x: 1, y: 2 });

    handler.handleRemovePlayer("p1");

    expect(playerRepository.getById("p1")).toBeUndefined();
  });

  it("退出プレイヤーの描画オブジェクトをワールドから除去すること", () => {
    const { handler, playerRepository, removedChildren } = createHandler();
    handler.handleNewPlayer({ id: "p1", name: "たろう", teamId: 1, x: 1, y: 2 });
    const displayObject = playerRepository.getById("p1")?.getDisplayObject();

    handler.handleRemovePlayer("p1");

    expect(removedChildren).toEqual([displayObject]);
  });

  it("退出プレイヤーのコントローラーを破棄すること", () => {
    const { handler, playerRepository } = createHandler();
    handler.handleNewPlayer({ id: "p1", name: "たろう", teamId: 1, x: 1, y: 2 });
    const destroySpy = vi.spyOn(
      playerRepository.getById("p1") as RemotePlayerController,
      "destroy",
    );

    handler.handleRemovePlayer("p1");

    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it("未登録IDの退出通知では何もしないこと", () => {
    const { handler, removedChildren } = createHandler();

    handler.handleRemovePlayer("unknown");

    expect(removedChildren).toEqual([]);
  });

  it("メソッドを取り出して呼び出してもインスタンスへ束縛されていること", () => {
    const { handler, playerRepository } = createHandler();
    const detached = handler.handleNewPlayer;

    detached({ id: "p1", name: "たろう", teamId: 1, x: 1, y: 2 });

    expect(playerRepository.getById("p1")).toBeDefined();
  });
});
