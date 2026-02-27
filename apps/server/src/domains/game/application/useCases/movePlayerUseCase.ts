/**
 * movePlayerUseCase
 * プレイヤー移動入力を受け取り，ゲーム管理へ反映する
 */
import { domain } from "@repo/shared";
import type { MovePlayerPort } from "../ports/gameUseCasePorts";

type MovePlayerUseCaseParams = {
  gameManager: MovePlayerPort;
  playerId: string;
  move: domain.player.MovePayload;
};

/** プレイヤー移動入力をゲーム管理へ委譲する */
export const movePlayerUseCase = ({
  gameManager,
  playerId,
  move,
}: MovePlayerUseCaseParams) => {
  gameManager.movePlayer(playerId, move.x, move.y);
};
