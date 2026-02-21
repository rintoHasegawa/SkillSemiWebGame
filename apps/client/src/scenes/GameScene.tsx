import { useEffect, useRef } from "react";
import { Application, Container } from "pixi.js";

// ネットワーク・入力
import { socketClient, type PlayerData } from "../network/SocketClient";
import { VirtualJoystick, MAX_DIST } from "../input/VirtualJoystick";

// ゲームオブジェクト
import { GameMap } from "../entities/GameMap";
import { Player } from "../entities/Player";

interface GameSceneProps {
  myId: string | null;
}

export function GameScene({ myId }: GameSceneProps) {
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const joystickInputRef = useRef({ x: 0, y: 0 });
  const playersRef = useRef<Record<string, Player>>({});

  useEffect(() => {
    if (!pixiContainerRef.current) return;

    let isCancelled = false;
    let isInitialized = false;
    const app = new Application();
    const worldContainer = new Container();

    const initPixi = async () => {
      // マップを一番下のレイヤー（背景）として追加
      const gameMap = new GameMap();
      worldContainer.addChild(gameMap);

      // サーバーからのデータ受信設定
      socketClient.onCurrentPlayers((serverPlayers: PlayerData[] | Record<string, PlayerData>) => {
        console.log("🔥 プレイヤー一覧を受信:", serverPlayers);
        const playersArray = (Array.isArray(serverPlayers) ? serverPlayers : Object.values(serverPlayers)) as PlayerData[];
        playersArray.forEach((p) => {
          const isMe = p.id === myId;
          const playerSprite = new Player(p.color, isMe);
          playerSprite.position.set(p.x, p.y);
          worldContainer.addChild(playerSprite);
          playersRef.current[p.id] = playerSprite;
        });
      });

      socketClient.onNewPlayer((p: PlayerData) => {
        console.log("🔥 新規プレイヤー参加:", p);
        const playerSprite = new Player(p.color, false);
        playerSprite.position.set(p.x, p.y);
        worldContainer.addChild(playerSprite);
        playersRef.current[p.id] = playerSprite;
      });

      socketClient.onUpdatePlayer((data: Partial<PlayerData> & { id: string }) => {
        if (data.id === myId) return;
        const target = playersRef.current[data.id];
        if (target) {
          if (data.x !== undefined) target.x = data.x;
          if (data.y !== undefined) target.y = data.y;
        }
      });

      socketClient.onRemovePlayer((id: string) => {
        const target = playersRef.current[id];
        if (target) {
          worldContainer.removeChild(target);
          target.destroy();
          delete playersRef.current[id];
        }
      });

      // PixiJSの初期化
      await app.init({ resizeTo: window, backgroundColor: 0x111111, antialias: true });
      isInitialized = true;
      
      // 🚨 もし初期化を待っている間にReactがアンマウントされていたら、ここで破棄して終了する
      if (isCancelled) {
        app.destroy(true, { children: true });
        return;
      }
      
      pixiContainerRef.current?.appendChild(app.canvas);
      app.stage.addChild(worldContainer);

      // 受信設定完了後、サーバーにデータを要求
      socketClient.readyForGame();

      // ゲームループ（Ticker）
      app.ticker.add((ticker) => {
        if (!myId) return;
        const me = playersRef.current[myId];
        if (!me) return; 

        const { x: dx, y: dy } = joystickInputRef.current;
        
        if (dx !== 0 || dy !== 0) {
          me.move(dx / MAX_DIST, dy / MAX_DIST, ticker.deltaTime);
          socketClient.sendMove(me.x, me.y);
        }

        // カメラ追従
        worldContainer.position.set(
          -(me.x - window.innerWidth / 2),
          -(me.y - window.innerHeight / 2)
        );
      });
    };

    initPixi();

    // クリーンアップ処理 (アンマウント時に実行)
    return () => {
      isCancelled = true;

      if (isInitialized) {
        app.destroy(true, { children: true });
      }
      
      playersRef.current = {};
      
      // ソケットの受信設定を解除
      socketClient.socket.off("current_players");
      socketClient.socket.off("new_player");
      socketClient.socket.off("update_player");
      socketClient.socket.off("remove_player");
    };
  }, [myId]); // myId を依存配列に設定

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative", backgroundColor: "#000" }}>
      <div ref={pixiContainerRef} style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }} />
      <div style={{ position: "absolute", zIndex: 2, width: "100%", height: "100%" }}>
        <VirtualJoystick onMove={(x, y) => { joystickInputRef.current = { x, y }; }} />
      </div>
    </div>
  );
}