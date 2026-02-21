import { useEffect, useState, useRef } from "react";
import { Application, Container } from "pixi.js";

// ネットワーク・入力
import { socketClient, type PlayerData } from "./network/SocketClient";
import { VirtualJoystick, MAX_DIST } from "./input/VirtualJoystick";

// シーン（画面）コンポーネント
import { TitleScene } from "./scenes/TitleScene";
import { LobbyScene } from "./scenes/LobbyScene";

// ゲームオブジェクト（純粋なPixiJSクラス）
import { GameMap } from "./entities/GameMap";
import { Player } from "./entities/Player";

import type { Room } from "@repo/shared/src/types/room";

export default function App() {
  const [gameState, setGameState] = useState<"title" | "lobby" | "playing">("title");
  const [room, setRoom] = useState<Room | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const joystickInputRef = useRef({ x: 0, y: 0 });
  const playersRef = useRef<Record<string, Player>>({});

  useEffect(() => {
    socketClient.onConnect((id) => setMyId(id));
    socketClient.onRoomUpdate((updatedRoom) => {
      setRoom(updatedRoom);
      setGameState("lobby");
    });
    socketClient.onGameStart(() => setGameState("playing"));
  }, []);

  /**
   * ゲーム本体（PixiJSの実行環境）
   */
  useEffect(() => {
    if (gameState !== "playing" || !pixiContainerRef.current) return;

    let isCancelled = false;
    const app = new Application();
    const worldContainer = new Container();

    const initPixi = async () => {
      // 🌟 【修正ポイント】マップを「一番最初」にコンテナに追加する！
      // これでマップが一番下のレイヤー（背景）として確定します。
      const gameMap = new GameMap();
      worldContainer.addChild(gameMap);

      // マップを敷いた後で、ソケットの受信設定をする
      socketClient.onCurrentPlayers((serverPlayers: PlayerData[] | Record<string, PlayerData>) => {
        console.log("🔥 プレイヤー一覧を受信:", serverPlayers); // 確認用のログ
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

      // データの受け取り口を作った後で、ゆっくりPixiを初期化する
      await app.init({ resizeTo: window, backgroundColor: 0x111111, antialias: true });
      if (isCancelled) return;
      
      pixiContainerRef.current?.appendChild(app.canvas);
      app.stage.addChild(worldContainer);

      // 🌟 【新規追加】 画面も受信設定もすべて完了したので、サーバーに「データちょうだい！」と要求する
      socketClient.readyForGame();

      // ゲームループ（Ticker）
      app.ticker.add((ticker) => {
        if (!myId) return;
        const me = playersRef.current[myId];
        if (!me) return; // 👈 自分のデータがない場合はここで処理が止まっていた

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

    // 🚨 【修正ポイント2】 クリーンアップ処理を追加
    return () => {
      isCancelled = true;
      app.destroy(true, { children: true });
      playersRef.current = {};
      
      // コンポーネントが破棄される時に、ソケットの受信設定も解除する（重複防止）
      socketClient.socket.off("current_players");
      socketClient.socket.off("new_player");
      socketClient.socket.off("update_player");
      socketClient.socket.off("remove_player");
    };
  }, [gameState, myId]);

  // レンダリング分岐（省略：TitleScene / LobbyScene）
  if (gameState === "title") return <TitleScene onJoin={(roomId, playerName) => socketClient.joinRoom(roomId, playerName)} />;
  if (gameState === "lobby") return <LobbyScene room={room} myId={myId} onStart={() => socketClient.startGame()} />;

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative", backgroundColor: "#000" }}>
      <div ref={pixiContainerRef} style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }} />
      <div style={{ position: "absolute", zIndex: 2, width: "100%", height: "100%" }}>
        {/* ジョイスティックはReact UIとして管理 */}
        <VirtualJoystick onMove={(x, y) => { joystickInputRef.current = { x, y }; }} />
      </div>
    </div>
  );
}