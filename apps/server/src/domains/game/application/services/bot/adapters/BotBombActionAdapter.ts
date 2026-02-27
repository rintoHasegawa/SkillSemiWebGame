/**
 * BotBombActionAdapter
 * Bot由来の爆弾設置アクションをユースケースへ橋渡しする
 */
import type { PlaceBombPayload } from "@repo/shared";
import type {
  BombPlacementPort,
  StartGameOutputPort,
} from "../../../ports/gameUseCasePorts";
import { placeBombUseCase } from "../../../useCases/placeBombUseCase";

type CreateBotBombActionHandlerParams = {
  roomId: string;
  bombStore: BombPlacementPort;
  output: StartGameOutputPort;
};

/** Bot爆弾アクションを処理するコールバックを生成する */
export const createBotBombActionHandler = ({
  roomId,
  bombStore,
  output,
}: CreateBotBombActionHandlerParams) => {
  return (ownerId: string, payload: PlaceBombPayload): void => {
    placeBombUseCase({
      roomId,
      bombStore,
      input: {
        requesterSocketId: ownerId,
        ownerPlayerId: ownerId,
        payload,
        nowMs: Date.now(),
      },
      output,
    });
  };
};
