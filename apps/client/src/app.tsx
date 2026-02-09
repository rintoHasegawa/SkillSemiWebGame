import { useEffect, useRef } from 'preact/hooks';
import { Application } from 'pixi.js';

// 👇 ここを変更しました！
// 元: import { Joystick } from './Joystick';
import { Joystick } from './input/Joystick'; 


import { Player } from './entities/Player';

import './app.css';

export function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. PixiJSアプリケーションの作成
    const app = new Application();

    const initGame = async () => {
      await app.init({
        resizeTo: window,
        backgroundColor: 0x1099bb,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (containerRef.current) {
        containerRef.current.appendChild(app.canvas);
      }

      // 2. プレイヤーの作成
      const player = new Player(0xff0000);
      player.x = app.screen.width / 2;
      player.y = app.screen.height / 2;
      app.stage.addChild(player);

      // 3. ジョイスティックの作成
      const joystick = new Joystick();
      app.stage.addChild(joystick);

      // 4. ゲームループ
      app.ticker.add((ticker) => {
        if (joystick.input.x !== 0 || joystick.input.y !== 0) {
          player.move(joystick.input.x, joystick.input.y, ticker.deltaTime);
        }
      });
    };

    initGame();

    return () => {
      app.destroy(true, { children: true });
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}