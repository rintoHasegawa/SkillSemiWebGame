import { useEffect, useRef } from "react";
import { Application, Container } from "pixi.js";

// ネットワーク・入力関連
import { socketClient } from "../network/SocketClient";
import { VirtualJoystick, MAX_DIST } from "../input/VirtualJoystick";
import { GAME_CONFIG } from "@repo/shared/src/config/gameConfig";
import { type PlayerData } from "@repo/shared/src/types/player";

// ゲーム描画オブジェクト
import { GameMap } from "../entities/GameMap";
// 変更点: BasePlayer, LocalPlayer, RemotePlayer をインポート
import { BasePlayer, LocalPlayer, RemotePlayer } from "../entities/Player";

interface GameSceneProps {
  myId: string | null;
}

/**
 * メインゲーム画面コンポーネント
 * PixiJS 初期化・エンティティ管理・ソケット同期処理
 */
export function GameScene({ myId }: GameSceneProps) {
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  // ジョイスティック入力値
  const joystickInputRef = useRef({ x: 0, y: 0 });
  
  // 変更点: 型を共通基底クラス BasePlayer に変更
  const playersRef = useRef<Record<string, BasePlayer>>({});
  
  // 位置送信間隔制御用タイムスタンプ
  const lastPositionSentTimeRef = useRef<number>(0);
  // 前フレーム移動状態
  const wasMovingRef = useRef<boolean>(false);

  // 💡 削除: targetPositionsRef は RemotePlayer 内にカプセル化されたため不要になりました！

  useEffect(() => {
    if (!pixiContainerRef.current) return;

    let isCancelled = false;
    let isInitialized = false;
    const app = new Application();
    const worldContainer = new Container();

    const initPixi = async () => {
      // 背景マップ最背面配置
      const gameMap = new GameMap();
      worldContainer.addChild(gameMap);

      // --- ソケットイベント購読登録 ---

      // 参加済みプレイヤー初期スプライト生成
      socketClient.onCurrentPlayers((serverPlayers: PlayerData[] | Record<string, PlayerData>) => {
        const playersArray = (Array.isArray(serverPlayers) ? serverPlayers : Object.values(serverPlayers)) as PlayerData[];
        playersArray.forEach((p) => {
          // 変更点: 自身か他プレイヤーかで生成するインスタンスを切り替え
          const playerSprite = p.id === myId 
            ? new LocalPlayer(p) 
            : new RemotePlayer(p);
            
          worldContainer.addChild(playerSprite);
          playersRef.current[p.id] = playerSprite;
        });
      });

      // 新規参加プレイヤー追加処理
      socketClient.onNewPlayer((p: PlayerData) => {
        // 新規参加は必ず他人なので RemotePlayer を生成
        const playerSprite = new RemotePlayer(p);
        worldContainer.addChild(playerSprite);
        playersRef.current[p.id] = playerSprite;
      });

      // 他プレイヤー目標座標更新
      socketClient.onUpdatePlayer((data: Partial<PlayerData> & { id: string }) => {
        if (data.id === myId) return;
        
        const target = playersRef.current[data.id];
        // 変更点: RemotePlayer のメソッドを呼び出して目標座標をセットするだけ
        if (target && target instanceof RemotePlayer) {
          target.setTargetPosition(data.x, data.y);
        }
      });

      // 退出プレイヤー参照削除とオブジェクト破棄
      socketClient.onRemovePlayer((id: string) => {
        const target = playersRef.current[id];
        if (target) {
          worldContainer.removeChild(target);
          target.destroy();
          delete playersRef.current[id];
        }
      });

      // --- PixiJS 本体初期化 ---
      await app.init({ resizeTo: window, backgroundColor: 0x111111, antialias: true });
      isInitialized = true;
      
      if (isCancelled) {
        app.destroy(true, { children: true });
        return;
      }
      
      pixiContainerRef.current?.appendChild(app.canvas);
      app.stage.addChild(worldContainer);

      socketClient.readyForGame();

      // --- メインゲームループ ---
      app.ticker.add((ticker) => {
        if (!myId) return;
        const me = playersRef.current[myId];
        // 自身が LocalPlayer であることを担保
        if (!me || !(me instanceof LocalPlayer)) return; 

        // 自プレイヤー移動と送信処理
        const { x: dx, y: dy } = joystickInputRef.current;
        const isMoving = dx !== 0 || dy !== 0;
        
        if (isMoving) {
          me.move(dx / MAX_DIST, dy / MAX_DIST, ticker.deltaTime);
          
          const now = performance.now();
          if (now - lastPositionSentTimeRef.current >= GAME_CONFIG.PLAYER_POSITION_UPDATE_MS) {
            socketClient.sendMove(me.x, me.y);
            lastPositionSentTimeRef.current = now;
          }
        } else if (wasMovingRef.current) {
          socketClient.sendMove(me.x, me.y);
        }
        wasMovingRef.current = isMoving;

        // 変更点: ループ内の補間処理がなくなり、一律に update を呼ぶだけになりました！（ポリモーフィズム）
        Object.values(playersRef.current).forEach((player) => {
          player.update(ticker.deltaTime);
        });

        // 自プレイヤー中心表示向けワールド逆方向オフセット（カメラ追従）
        worldContainer.position.set(
          -(me.x - app.screen.width / 2),
          -(me.y - app.screen.height / 2)
        );
      });
    };

    initPixi();

    return () => {
      isCancelled = true;
      if (isInitialized) {
        app.destroy(true, { children: true });
      }
      playersRef.current = {};
      
      socketClient.socket.off("current_players");
      socketClient.socket.off("new_player");
      socketClient.socket.off("update_player");
      socketClient.socket.off("remove_player");
    };
  }, [myId]);

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative", backgroundColor: "#000" }}>
      <div ref={pixiContainerRef} style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }} />
      <div style={{ position: "absolute", zIndex: 2, width: "100%", height: "100%" }}>
        <VirtualJoystick onMove={(x, y) => { joystickInputRef.current = { x, y }; }} />
      </div>
    </div>
  );
}