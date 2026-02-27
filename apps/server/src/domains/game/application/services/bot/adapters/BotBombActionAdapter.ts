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
  resolveClientVisiblePlayerId?: (playerId: string) => string;
  output: StartGameOutputPort;
};

/** Bot爆弾アクションを処理するコールバックを生成する */
export const createBotBombActionHandler = ({
  roomId,
  bombStore,
  resolveClientVisiblePlayerId,
  output,
}: CreateBotBombActionHandlerParams) => {
  return (ownerId: string, payload: PlaceBombPayload): void => {
    const ownerClientVisibleId = resolveClientVisiblePlayerId
      ? resolveClientVisiblePlayerId(ownerId)
      : ownerId;

    placeBombUseCase({
      roomId,
      bombStore,
      input: {
        socketId: ownerClientVisibleId,
        payload,
        nowMs: Date.now(),
      },
      output,
    });
  };
};
