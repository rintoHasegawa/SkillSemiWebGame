import { useEffect, useRef } from "react";
import { Application, Container } from "pixi.js";

// ネットワーク・入力関連
import { socketClient} from "../network/SocketClient";
import { VirtualJoystick, MAX_DIST } from "../input/VirtualJoystick";
import { GAME_CONFIG } from "@repo/shared/src/config/gameConfig";
import { type PlayerData } from "@repo/shared/src/types/player";

// ゲーム描画オブジェクト
import { GameMap } from "../entities/GameMap";
import { Player } from "../entities/Player";

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
  // プレイヤースプライト参照テーブル
  const playersRef = useRef<Record<string, Player>>({});
  // 位置送信間隔制御用タイムスタンプ
  const lastPositionSentTimeRef = useRef<number>(0);
  // 他プレイヤー補間用目標座標テーブル
  const targetPositionsRef = useRef<Record<string, { x: number, y: number }>>({});
  // 前フレーム移動状態
  const wasMovingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!pixiContainerRef.current) return;

    // 非同期初期化中アンマウント判定フラグ
    let isCancelled = false;
    // Pixi 初期化完了フラグ
    let isInitialized = false;
    const app = new Application();
    // カメラ追従向けワールド親コンテナ
    const worldContainer = new Container();

    const initPixi = async () => {
      // 背景マップ最背面配置
      const gameMap = new GameMap();
      worldContainer.addChild(gameMap);

      // ソケットイベント購読登録

      // 参加済みプレイヤー初期スプライト生成
      socketClient.onCurrentPlayers((serverPlayers: PlayerData[] | Record<string, PlayerData>) => {
        console.log("🔥 プレイヤー一覧を受信:", serverPlayers);
        const playersArray = (Array.isArray(serverPlayers) ? serverPlayers : Object.values(serverPlayers)) as PlayerData[];
        playersArray.forEach((p) => {
          const isMe = p.id === myId;
          const playerSprite = new Player(GAME_CONFIG.TEAM_COLORS[p.teamId], isMe);
          playerSprite.position.set(p.x, p.y);
          worldContainer.addChild(playerSprite);
          playersRef.current[p.id] = playerSprite;
          targetPositionsRef.current[p.id] = { x: p.x, y: p.y };
        });
      });

      // 新規参加プレイヤー追加処理
      socketClient.onNewPlayer((p: PlayerData) => {
        console.log("🔥 新規プレイヤー参加:", p);
        const playerSprite = new Player(GAME_CONFIG.TEAM_COLORS[p.teamId], false);
        playerSprite.position.set(p.x, p.y);
        worldContainer.addChild(playerSprite);
        playersRef.current[p.id] = playerSprite;
        targetPositionsRef.current[p.id] = { x: p.x, y: p.y };
      });

      // 他プレイヤー目標座標更新
      socketClient.onUpdatePlayer((data: Partial<PlayerData> & { id: string }) => {
        if (data.id === myId) return;
        
        const targetPos = targetPositionsRef.current[data.id];
        if (targetPos) {
          if (data.x !== undefined) targetPos.x = data.x;
          if (data.y !== undefined) targetPos.y = data.y;
        }
      });

      // 退出プレイヤー参照削除とオブジェクト破棄
      socketClient.onRemovePlayer((id: string) => {
        const target = playersRef.current[id];
        if (target) {
          worldContainer.removeChild(target);
          target.destroy();
          delete playersRef.current[id];
          delete targetPositionsRef.current[id];
        }
      });

      // PixiJS 本体初期化
      await app.init({ resizeTo: window, backgroundColor: 0x111111, antialias: true });
      isInitialized = true;
      
      // 初期化待機中アンマウント時の即時破棄分岐
      if (isCancelled) {
        app.destroy(true, { children: true });
        return;
      }
      
      // ルートステージへのワールド追加
      pixiContainerRef.current?.appendChild(app.canvas);
      app.stage.addChild(worldContainer);

      // 画面準備完了通知送信
      socketClient.readyForGame();

      // メインゲームループ登録
      app.ticker.add((ticker) => {
        if (!myId) return;
        const me = playersRef.current[myId];
        if (!me) return; 

        // 自プレイヤー移動処理
        const { x: dx, y: dy } = joystickInputRef.current;
        const isMoving = dx !== 0 || dy !== 0;
        
        if (isMoving) {
          me.move(dx / MAX_DIST, dy / MAX_DIST, ticker.deltaTime);
          
          // 通信負荷抑制向け間引き送信
          const now = performance.now();
          if (now - lastPositionSentTimeRef.current >= GAME_CONFIG.PLAYER_POSITION_UPDATE_MS) {
            socketClient.sendMove(me.x, me.y);
            lastPositionSentTimeRef.current = now;
          }
        } else if (wasMovingRef.current) {
          // 停止瞬間の確定座標単発送信
          socketClient.sendMove(me.x, me.y);
        }

        // 次フレーム比較用移動状態保存
        wasMovingRef.current = isMoving;

        // 他プレイヤー座標の線形補間と閾値吸着
        Object.entries(playersRef.current).forEach(([id, player]) => {
          if (id === myId) return;

          const targetPos = targetPositionsRef.current[id];
          if (targetPos) {
            const diffX = targetPos.x - player.x;
            const diffY = targetPos.y - player.y;

            // X軸方向補間と吸着
            if (Math.abs(diffX) < GAME_CONFIG.PLAYER_LERP_SNAP_THRESHOLD) {
              player.x = targetPos.x;
            } else {
              player.x += diffX * GAME_CONFIG.PLAYER_LERP_SMOOTHNESS * ticker.deltaTime;
            }

            // Y軸方向補間と吸着
            if (Math.abs(diffY) < GAME_CONFIG.PLAYER_LERP_SNAP_THRESHOLD) {
              player.y = targetPos.y;
            } else {
              player.y += diffY * GAME_CONFIG.PLAYER_LERP_SMOOTHNESS * ticker.deltaTime;
            }
          }
        });

        // 自プレイヤー中心表示向けワールド逆方向オフセット
        worldContainer.position.set(
          -(me.x - app.screen.width / 2),
          -(me.y - app.screen.height / 2)
        );
      });
    };

    initPixi();

    // コンポーネント破棄時クリーンアップ
    return () => {
      isCancelled = true;

      if (isInitialized) {
        app.destroy(true, { children: true });
      }

      playersRef.current = {};
      
      // メモリリーク防止向けイベント購読解除
      socketClient.socket.off("current_players");
      socketClient.socket.off("new_player");
      socketClient.socket.off("update_player");
      socketClient.socket.off("remove_player");
    };
  }, [myId]);

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative", backgroundColor: "#000" }}>
      {/* PixiJS Canvas 配置領域 */}
      <div ref={pixiContainerRef} style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }} />
      
      {/* 入力UI重畳用前面レイヤー */}
      <div style={{ position: "absolute", zIndex: 2, width: "100%", height: "100%" }}>
        <VirtualJoystick onMove={(x, y) => { joystickInputRef.current = { x, y }; }} />
      </div>
    </div>
  );
}