import { useEffect, useRef } from "react";
import { Application, Container } from "pixi.js";

// ネットワーク・入力
import { socketClient, type PlayerData } from "../network/SocketClient";
import { VirtualJoystick, MAX_DIST } from "../input/VirtualJoystick";
import { GAME_CONFIG } from "@repo/shared/src/config/gameConfig";

// ゲームオブジェクト
import { GameMap } from "../entities/GameMap";
import { Player } from "../entities/Player";

interface GameSceneProps {
  myId: string | null;
}

/**
 * メインのゲーム画面コンポーネント
 * PixiJSの初期化、エンティティの管理、ソケット通信の同期を行う
 */
export function GameScene({ myId }: GameSceneProps) {
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const joystickInputRef = useRef({ x: 0, y: 0 }); // ジョイスティックの入力値を保持
  const playersRef = useRef<Record<string, Player>>({}); // 全プレイヤーのスプライト参照
  const lastPositionSentTimeRef = useRef<number>(0); // サーバーへの位置送信タイミングを制御
  const targetPositionsRef = useRef<Record<string, { x: number, y: number }>>({}); // 他プレイヤーの目標位置（補完用）
  const wasMovingRef = useRef<boolean>(false); // 移動状態の変化を検知するためのフラグ

  useEffect(() => {
    if (!pixiContainerRef.current) return;

    let isCancelled = false; // 非同期処理中のクリーンアップ判定用
    let isInitialized = false;
    const app = new Application();
    const worldContainer = new Container(); // カメラ移動を実現するための親コンテナ

    const initPixi = async () => {
      // マップを一番下のレイヤー（背景）として追加
      const gameMap = new GameMap();
      worldContainer.addChild(gameMap);

      // --- ソケットイベントリスナーの設定 ---

      // 接続時：既存の全プレイヤーを生成
      socketClient.onCurrentPlayers((serverPlayers: PlayerData[] | Record<string, PlayerData>) => {
        console.log("🔥 プレイヤー一覧を受信:", serverPlayers);
        const playersArray = (Array.isArray(serverPlayers) ? serverPlayers : Object.values(serverPlayers)) as PlayerData[];
        playersArray.forEach((p) => {
          const isMe = p.id === myId;
          const playerSprite = new Player(p.color, isMe);
          playerSprite.position.set(p.x, p.y);
          worldContainer.addChild(playerSprite);
          playersRef.current[p.id] = playerSprite;
          targetPositionsRef.current[p.id] = { x: p.x, y: p.y };
        });
      });

      // 新規参加：新しいプレイヤーを画面に追加
      socketClient.onNewPlayer((p: PlayerData) => {
        console.log("🔥 新規プレイヤー参加:", p);
        const playerSprite = new Player(p.color, false);
        playerSprite.position.set(p.x, p.y);
        worldContainer.addChild(playerSprite);
        playersRef.current[p.id] = playerSprite;
        targetPositionsRef.current[p.id] = { x: p.x, y: p.y };
      });

      // 更新：他プレイヤーの移動目標地点を更新
      socketClient.onUpdatePlayer((data: Partial<PlayerData> & { id: string }) => {
        if (data.id === myId) return;
        
        const targetPos = targetPositionsRef.current[data.id];
        if (targetPos) {
          if (data.x !== undefined) targetPos.x = data.x;
          if (data.y !== undefined) targetPos.y = data.y;
        }
      });

      // 退出：プレイヤーを削除してメモリを解放
      socketClient.onRemovePlayer((id: string) => {
        const target = playersRef.current[id];
        if (target) {
          worldContainer.removeChild(target);
          target.destroy();
          delete playersRef.current[id];
          delete targetPositionsRef.current[id];
        }
      });

      // PixiJS本体の初期化
      await app.init({ resizeTo: window, backgroundColor: 0x111111, antialias: true });
      isInitialized = true;
      
      // 🚨 もし初期化を待っている間にReactがアンマウントされていたら、ここで破棄して終了する
      if (isCancelled) {
        app.destroy(true, { children: true });
        return;
      }
      
      pixiContainerRef.current?.appendChild(app.canvas);
      app.stage.addChild(worldContainer);

      // 全ての準備が整ったことをサーバーに通知
      socketClient.readyForGame();

      // --- メインゲームループ（Ticker） ---
      app.ticker.add((ticker) => {
        if (!myId) return;
        const me = playersRef.current[myId];
        if (!me) return; 

        // 自分の移動処理
        const { x: dx, y: dy } = joystickInputRef.current;
        const isMoving = dx !== 0 || dy !== 0;
        
        if (isMoving) {
          me.move(dx / MAX_DIST, dy / MAX_DIST, ticker.deltaTime);
          
          // 通信負荷軽減のため、一定間隔でのみサーバーへ位置を送信
          const now = performance.now();
          if (now - lastPositionSentTimeRef.current >= GAME_CONFIG.PLAYER_POSITION_UPDATE_MS) {
            socketClient.sendMove(me.x, me.y);
            lastPositionSentTimeRef.current = now;
          }
        } else if (wasMovingRef.current) {
          // 💡 止まった瞬間の確定座標を1回だけ送信して他プレイヤーとのズレを防ぐ
          socketClient.sendMove(me.x, me.y);
        }

        // 今回の移動状態を次回ループのために保存
        wasMovingRef.current = isMoving;

        // 他プレイヤーの線形補間（Lerp）処理と吸着（Snap）
        Object.entries(playersRef.current).forEach(([id, player]) => {
          if (id === myId) return;

          const targetPos = targetPositionsRef.current[id];
          if (targetPos) {
            const diffX = targetPos.x - player.x;
            const diffY = targetPos.y - player.y;

            // X軸の補完と吸着
            if (Math.abs(diffX) < GAME_CONFIG.PLAYER_LERP_SNAP_THRESHOLD) {
              player.x = targetPos.x;
            } else {
              player.x += diffX * GAME_CONFIG.PLAYER_LERP_SMOOTHNESS * ticker.deltaTime;
            }

            // Y軸の補完と吸着
            if (Math.abs(diffY) < GAME_CONFIG.PLAYER_LERP_SNAP_THRESHOLD) {
              player.y = targetPos.y;
            } else {
              player.y += diffY * GAME_CONFIG.PLAYER_LERP_SMOOTHNESS * ticker.deltaTime;
            }
          }
        });

        // カメラ追従：自分を中心に世界を逆方向にずらす
        worldContainer.position.set(
          -(me.x - app.screen.width / 2),
          -(me.y - app.screen.height / 2)
        );
      });
    };

    initPixi();

    // クリーンアップ処理 (コンポーネントのアンマウント時に実行)
    return () => {
      isCancelled = true;

      if (isInitialized) {
        app.destroy(true, { children: true });
      }

      playersRef.current = {};
      
      // メモリリーク防止のためソケットのイベント登録を解除
      socketClient.socket.off("current_players");
      socketClient.socket.off("new_player");
      socketClient.socket.off("update_player");
      socketClient.socket.off("remove_player");
    };
  }, [myId]); // 自分のIDが確定したタイミングで再実行

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative", backgroundColor: "#000" }}>
      {/* PixiJSのCanvasが挿入される要素 */}
      <div ref={pixiContainerRef} style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }} />
      
      {/* UIレイヤー：ジョイスティック等 */}
      <div style={{ position: "absolute", zIndex: 2, width: "100%", height: "100%" }}>
        <VirtualJoystick onMove={(x, y) => { joystickInputRef.current = { x, y }; }} />
      </div>
    </div>
  );
}