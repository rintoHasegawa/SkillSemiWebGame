/**
 * playerFixtures
 * ユニットテスト専用のプレイヤー関連フィクスチャを提供する
 * 送受信DTO（PlayerData）とサーバー内エンティティ（Player）の生成を集約する
 * ※ テスト専用のため本番コードから import してはならない（ビルド対象外）
 */
import { domain } from "@repo/shared";

import { Player } from "@server/domains/game/entities/player/Player";

/** プレイヤーDTOの既定値を部分上書きして生成する */
export const createPlayerData = (
  id: string,
  overrides: Partial<domain.game.player.PlayerData> = {},
): domain.game.player.PlayerData => {
  return { id, name: `name-${id}`, x: 0, y: 0, teamId: 0, ...overrides };
};

/** プレイヤーエンティティ生成の入力（未指定項目は既定値を使う） */
export type PlayerEntityParams = {
  id?: string;
  name?: string;
  teamId?: number;
  x?: number;
  y?: number;
  /** 未指定時は x と同値（playerSpawn と同じくスポーン地点＝現在地とする） */
  initialX?: number;
  /** 未指定時は y と同値（playerSpawn と同じくスポーン地点＝現在地とする） */
  initialY?: number;
};

/** プレイヤーエンティティを座標付きで生成する */
export const createPlayerEntity = ({
  id = "socket-1",
  name = id,
  teamId = 0,
  x = 0,
  y = 0,
  initialX = x,
  initialY = y,
}: PlayerEntityParams = {}): Player => {
  const player = new Player(id, name, teamId);
  player.x = x;
  player.y = y;
  player.initialX = initialX;
  player.initialY = initialY;

  return player;
};
