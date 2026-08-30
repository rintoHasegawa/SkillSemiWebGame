/**
 * gameOutputFixtures
 * ユニットテスト専用のゲーム出力アダプタースタブを提供する
 * ゲーム出力アダプター（GameOutputAdapter）の全メソッドをモックで用意し，
 * 送信内容の記録と呼び出し検証に使えるようにする
 * ※ テスト専用のため本番コードから import してはならない（ビルド対象外）
 */
import { vi, type Mock } from "vitest";

import type { GameOutputAdapter } from "@server/network/handlers/game/createGameOutputAdapter";

/** ゲーム出力アダプターの全メソッドをモック化したスタブ型 */
export type GameOutputAdapterStub = {
  [K in keyof GameOutputAdapter]: Mock<GameOutputAdapter[K]>;
};

/** 送信内容を記録するゲーム出力アダプタースタブを生成する */
export const createGameOutputAdapterStub = (): GameOutputAdapterStub => {
  return {
    publishPongToSocket: vi.fn<GameOutputAdapter["publishPongToSocket"]>(),
    publishUpdatePlayersToRoom: vi.fn<
      GameOutputAdapter["publishUpdatePlayersToRoom"]
    >(),
    publishMapCellUpdatesToRoom: vi.fn<
      GameOutputAdapter["publishMapCellUpdatesToRoom"]
    >(),
    publishCurrentHurricanesToRoom: vi.fn<
      GameOutputAdapter["publishCurrentHurricanesToRoom"]
    >(),
    publishUpdateHurricanesToRoom: vi.fn<
      GameOutputAdapter["publishUpdateHurricanesToRoom"]
    >(),
    publishGameEndToRoom: vi.fn<GameOutputAdapter["publishGameEndToRoom"]>(),
    publishGameResultToRoom: vi.fn<
      GameOutputAdapter["publishGameResultToRoom"]
    >(),
    publishGameStartToRoom: vi.fn<GameOutputAdapter["publishGameStartToRoom"]>(),
    publishCurrentPlayersToSocket: vi.fn<
      GameOutputAdapter["publishCurrentPlayersToSocket"]
    >(),
    publishMapCellsToSocket: vi.fn<
      GameOutputAdapter["publishMapCellsToSocket"]
    >(),
    publishGameStartToSocket: vi.fn<
      GameOutputAdapter["publishGameStartToSocket"]
    >(),
    publishBombPlacedToOthersInRoom: vi.fn<
      GameOutputAdapter["publishBombPlacedToOthersInRoom"]
    >(),
    publishBombPlacedAckToSocket: vi.fn<
      GameOutputAdapter["publishBombPlacedAckToSocket"]
    >(),
    publishPlayerHitToOthersInRoom: vi.fn<
      GameOutputAdapter["publishPlayerHitToOthersInRoom"]
    >(),
    publishPlayerHitToRoom: vi.fn<GameOutputAdapter["publishPlayerHitToRoom"]>(),
    publishHurricaneHitToRoom: vi.fn<
      GameOutputAdapter["publishHurricaneHitToRoom"]
    >(),
  };
};
