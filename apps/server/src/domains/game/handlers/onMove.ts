import { GameManager } from "@server/domains/game/GameManager";
import type { playerTypes } from "@repo/shared";

export const onMove = (
  gameManager: GameManager,
  playerId: string,
  data: playerTypes.MovePayload
) => {
  gameManager.movePlayer(playerId, data.x, data.y);
};
