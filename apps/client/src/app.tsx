import { useEffect, useState, useRef } from "react";
import { Stage, Container } from "@pixi/react";

// ネットワーク・エンティティ・UIコンポーネントのインポート
import { socketClient } from "./network/SocketClient";
import { GameMap } from "./entities/GameMap";
import { PlayerSprite } from "./entities/PlayerSprite";
import { VirtualJoystick, MAX_DIST } from "./input/VirtualJoystick";

// シーン（画面）コンポーネント
import { TitleScene } from "./scenes/TitleScene";
import { LobbyScene } from "./scenes/LobbyScene";

// 共有設定（マップサイズやプレイヤーの当たり判定サイズなど）
import { GAME_CONFIG } from "@repo/shared/src/config/gameConfig";
import type { Room } from "@repo/shared/src/types/room";

const { MAP_WIDTH, MAP_HEIGHT, PLAYER_RADIUS } = GAME_CONFIG;

// プレイヤーの型定義
type Player = { id: string; x: number; y: number; color: string; };

export default function App() {
  /**
   * 1. 状態管理 (State)
   */
  // ゲームの現在のフェーズ（タイトル、ロビー、プレイ中）
  const [gameState, setGameState] = useState<"title" | "lobby" | "playing">("title");
  const [room, setRoom] = useState<Room | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });

  /**
   * 2. 参照管理 (Refs)
   * 頻繁に更新される値（座標や入力）をStateに入れると再レンダリングが走りすぎるため、
   * useRef で保持して requestAnimationFrame 内で処理します。
   */
  const myPosRef = useRef({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 });
  const joystickInputRef = useRef({ x: 0, y: 0 });

  // ジョイスティックからの入力をRefに保存
  const handleJoystickMove = (moveX: number, moveY: number) => {
    joystickInputRef.current = { x: moveX, y: moveY };
  };

  /**
   * 3. ゲームループ (Game Loop)
   * プレイ中のみ動作し、自身の移動計算とサーバーへの送信を行います。
   */
  useEffect(() => {
    if (gameState !== "playing") return;

    let animationFrameId: number;
    const tick = () => {
      const { x: dx, y: dy } = joystickInputRef.current;
      
      // 入力がある場合のみ移動処理を実行
      if (myId && (dx !== 0 || dy !== 0)) {
        const speed = 5.0;
        // 入力値（0〜MAX_DIST）を正規化して座標を計算
        let nextX = myPosRef.current.x + (dx / MAX_DIST) * speed;
        let nextY = myPosRef.current.y + (dy / MAX_DIST) * speed;

        // マップの境界線から出ないように制限（クランプ処理）
        nextX = Math.max(PLAYER_RADIUS, Math.min(MAP_WIDTH - PLAYER_RADIUS, nextX));
        nextY = Math.max(PLAYER_RADIUS, Math.min(MAP_HEIGHT - PLAYER_RADIUS, nextY));

        // ローカルの座標情報を更新
        myPosRef.current = { x: nextX, y: nextY };
        
        // サーバーに最新の座標を送信
        socketClient.sendMove(nextX, nextY);

        // 自分の描画位置を即座に反映
        setPlayers((prev) => {
          if (!prev[myId]) return prev;
          return { ...prev, [myId]: { ...prev[myId], x: nextX, y: nextY } };
        });
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [myId, gameState]);

  /**
   * 4. ネットワークイベントの購読
   */
  useEffect(() => {
    // 接続時に自分のIDを保持
    socketClient.onConnect((id) => setMyId(id));

    // ルビーの状態更新を受け取ったらロビー画面へ
    socketClient.onRoomUpdate((updatedRoom) => {
      setRoom(updatedRoom);
      setGameState("lobby");
    });

    // ホストがゲームを開始した際の通知
    socketClient.onGameStart(() => {
      setGameState("playing");
    });

    // 初期プレイヤーリストの同期
    socketClient.onCurrentPlayers((serverPlayers: any) => {
      const pMap: Record<string, Player> = {};
      if (Array.isArray(serverPlayers)) serverPlayers.forEach((p) => (pMap[p.id] = p));
      else Object.assign(pMap, serverPlayers);
      setPlayers(pMap);
    });

    // 他プレイヤーの入室
    socketClient.onNewPlayer((p: Player) => setPlayers((prev) => ({ ...prev, [p.id]: p })));

    // 他プレイヤーの移動反映（自分自身の更新は Game Loop で行うため除外）
    socketClient.onUpdatePlayer((data: any) => {
      if (data.id === socketClient.socket.id) return;
      setPlayers((prev) => {
        if (!prev[data.id]) return prev;
        return { ...prev, [data.id]: { ...prev[data.id], ...data } };
      });
    });

    // 他プレイヤーの退室
    socketClient.onRemovePlayer((id: string) => {
      setPlayers((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });

    // ウィンドウサイズ変更への対応
    const handleResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /**
   * 5. レンダリング分岐（シーン切り替え）
   */
  // タイトル画面
  if (gameState === "title") {
    return <TitleScene onJoin={(roomId, playerName) => socketClient.joinRoom(roomId, playerName)} />;
  }

  // ロビー画面
  if (gameState === "lobby") {
    return <LobbyScene room={room} myId={myId} onStart={() => socketClient.startGame()} />;
  }

  /**
   * 6. ゲーム本編の描画
   */
  const me = myId ? players[myId] : null;
  // カメラの座標計算：自分を中心に据えるよう計算（マップ端でも追従）
  const camX = (me?.x ?? MAP_WIDTH / 2) - viewport.w / 2;
  const camY = (me?.y ?? MAP_HEIGHT / 2) - viewport.h / 2;

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", backgroundColor: "#000", position: "relative" }}>
      {/* PixiJS の描画エリア */}
      <div style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}>
        <Stage width={viewport.w} height={viewport.h} options={{ backgroundColor: 0x000000, antialias: true }}>
          {/* コンテナをカメラの逆方向に動かすことで「カメラ追従」を実現 */}
          <Container position={[-camX, -camY]}>
            {/* 背景マップ */}
            <GameMap />
            {/* 全プレイヤーの描画 */}
            {Object.values(players).map((p) => (
              <PlayerSprite key={p.id} x={p.x} y={p.y} color={p.color} isMe={p.id === myId} />
            ))}
          </Container>
        </Stage>
      </div>
      
      {/* UIレイヤー：ジョイスティック（Canvasの上に重ねて配置） */}
      <VirtualJoystick onMove={handleJoystickMove} />
    </div>
  );
}