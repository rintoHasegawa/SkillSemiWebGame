import { Application } from 'pixi.js';
import { Joystick } from './input/Joystick';
import { Player } from './entities/Player';

// アプリケーション初期化
const app = new Application();

async function init() {
  await app.init({ 
    resizeTo: window,
    backgroundColor: 0x1099bb 
  });
  document.body.appendChild(app.canvas);

  // 1. ジョイスティック作成
  const joystick = new Joystick();
  
  // 2. プレイヤー作成
  const player = new Player(0xFF4444);
  player.x = app.screen.width / 2;
  player.y = app.screen.height / 2;

  // 3. ステージに追加
  app.stage.addChild(player);
  app.stage.addChild(joystick); // ジョイスティックは手前に表示

  // 4. ゲームループ (毎フレーム実行)
  app.ticker.add((ticker) => {
    // 秒単位の経過時間 (Delta Time)
    const dt = ticker.deltaTime / 60;

    // ジョイスティックの入力があれば移動
    if (joystick.input.x !== 0 || joystick.input.y !== 0) {
      player.move(joystick.input.x, joystick.input.y, dt);
    }
  });
}

init();