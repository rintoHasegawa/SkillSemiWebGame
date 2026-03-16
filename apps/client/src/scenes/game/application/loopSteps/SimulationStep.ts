/**
 * SimulationStep
 * ゲームループのシミュレーション段を担う
 * ローカル更新とリモート補間更新を順に実行する
 */
import { config } from "@client/config";
import { LocalPlayerController, RemotePlayerController } from "@client/scenes/game/entities/player/PlayerController";
import type { PlayerRepository } from "@client/scenes/game/entities/player/PlayerRepository";
import type { MoveSender } from "@client/scenes/game/application/network/PlayerMoveSender";
import {
  expandWorldViewport,
  isCircleIntersectingViewport,
  resolveWorldViewport,
} from "@client/scenes/game/application/culling/worldViewport";
import type {
  LoopFrameContext,
  LoopFrameEffects,
  LoopMovementState,
  LoopStep,
} from "./LoopStep";

/** SimulationStep の初期化入力 */
type SimulationStepOptions = {
  moveSender: MoveSender;
  nowMsProvider?: () => number;
};

type SimulationStepParams = {
  me: LocalPlayerController;
  playerRepository: PlayerRepository;
  deltaSeconds: number;
  movementState: LoopMovementState;
};

/** シミュレーション段の更新処理を担うステップ */
export class SimulationStep implements LoopStep {
  private static readonly OFFSCREEN_REMOTE_UPDATE_INTERVAL_FRAMES = 6;
  private static readonly REMOTE_PLAYER_CULL_RADIUS_PX =
    config.GAME_CONFIG.PLAYER_RADIUS_PX * config.GAME_CONFIG.PLAYER_RENDER_SCALE;

  private readonly moveSender: MoveSender;
  private readonly nowMsProvider: () => number;
  private lastPositionSentTime = 0;
  private wasMoving = false;
  private frameCount = 0;

  constructor({ moveSender, nowMsProvider = () => performance.now() }: SimulationStepOptions) {
    this.moveSender = moveSender;
    this.nowMsProvider = nowMsProvider;
  }

  /** ローカル更新とリモート補間更新を実行する */
  public run(
    context: Readonly<LoopFrameContext>,
    effects: LoopFrameEffects,
  ): void {
    this.frameCount += 1;
    const params: SimulationStepParams = {
      me: context.me,
      playerRepository: context.playerRepository,
      deltaSeconds: context.deltaSeconds,
      movementState: effects.getMovementState(),
    };

    this.runLocalSimulation({ me: params.me, isMoving: params.movementState.isMoving });

    const meDisplay = params.me.getDisplayObject();
    const viewport = expandWorldViewport(
      resolveWorldViewport(
        meDisplay.x,
        meDisplay.y,
        context.app.screen.width,
        context.app.screen.height,
      ),
      config.GAME_CONFIG.GRID_CELL_SIZE,
    );

    this.runRemoteSimulation({
      playerRepository: params.playerRepository,
      deltaSeconds: params.deltaSeconds,
      viewport,
    });
  }

  private runLocalSimulation({ me, isMoving }: { me: LocalPlayerController; isMoving: boolean }) {
    if (isMoving) {
      me.tick();

      const now = this.nowMsProvider();
      if (
        now - this.lastPositionSentTime
        >= config.GAME_CONFIG.NETWORK_SYNC.PLAYER_POSITION_UPDATE_MS
      ) {
        const position = me.getPosition();
        this.moveSender.sendMove(position.x, position.y);
        this.lastPositionSentTime = now;
      }
    } else if (this.wasMoving) {
      me.tick();
      const position = me.getPosition();
      this.moveSender.sendMove(position.x, position.y, { force: true });
    } else {
      me.tick();
    }

    this.wasMoving = isMoving;
  }

  private runRemoteSimulation({
    playerRepository,
    deltaSeconds,
    viewport,
  }: Pick<SimulationStepParams, "playerRepository" | "deltaSeconds"> & {
    viewport: ReturnType<typeof resolveWorldViewport>;
  }) {
    const shouldTickOffscreen =
      this.frameCount % SimulationStep.OFFSCREEN_REMOTE_UPDATE_INTERVAL_FRAMES === 0;

    Object.values(playerRepository.toRecord()).forEach((player) => {
      if (player instanceof RemotePlayerController) {
        const display = player.getDisplayObject();
        const isVisible = isCircleIntersectingViewport(
          display.x,
          display.y,
          SimulationStep.REMOTE_PLAYER_CULL_RADIUS_PX,
          viewport,
        );
        display.visible = isVisible;

        if (!isVisible && !shouldTickOffscreen) {
          return;
        }

        const tickDeltaSeconds = isVisible
          ? deltaSeconds
          : deltaSeconds * SimulationStep.OFFSCREEN_REMOTE_UPDATE_INTERVAL_FRAMES;
        player.tick(tickDeltaSeconds);
      }
    });
  }
}