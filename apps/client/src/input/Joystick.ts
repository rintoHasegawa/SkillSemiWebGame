import { Container, Graphics, Point } from 'pixi.js';

export class Joystick extends Container {
  private outer: Graphics;
  private inner: Graphics;
  private pointerId: number | null = null;
  private startPos: Point = new Point();
  private currentPos: Point = new Point();
  
  // 入力ベクトル (x, y: -1.0 ~ 1.0)
  public input: Point = new Point(0, 0);

  constructor() {
    super();

    // 外枠（グレーの丸）
    this.outer = new Graphics().circle(0, 0, 60).fill({ color: 0xffffff, alpha: 0.3 });
    // 内側（白い丸）
    this.inner = new Graphics().circle(0, 0, 30).fill({ color: 0xffffff, alpha: 0.8 });

    this.addChild(this.outer);
    this.addChild(this.inner);
    
    // 最初は非表示
    this.visible = false;

    // イベントリスナー設定
    window.addEventListener('pointerdown', this.onDown.bind(this));
    window.addEventListener('pointermove', this.onMove.bind(this));
    window.addEventListener('pointerup', this.onUp.bind(this));
  }

  private onDown(e: PointerEvent) {
    // 画面の左半分だけ反応させるなどの制御もここで可能
    this.pointerId = e.pointerId;
    this.startPos.set(e.clientX, e.clientY);
    this.currentPos.copyFrom(this.startPos);

    // ジョイスティックを表示
    this.position.copyFrom(this.startPos);
    this.inner.position.set(0, 0);
    this.visible = true;
    this.input.set(0, 0);
  }

  private onMove(e: PointerEvent) {
    if (this.pointerId !== e.pointerId) return;

    const maxDist = 60; //スティックが動ける最大半径
    const dx = e.clientX - this.startPos.x;
    const dy = e.clientY - this.startPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 入力ベクトルの計算
    if (dist > 0) {
      const scale = Math.min(dist, maxDist);
      const angle = Math.atan2(dy, dx);
      
      // 内側の丸を移動
      this.inner.x = Math.cos(angle) * scale;
      this.inner.y = Math.sin(angle) * scale;

      // 正規化された入力値 (-1.0 ~ 1.0)
      this.input.x = this.inner.x / maxDist;
      this.input.y = this.inner.y / maxDist;
    }
  }

  private onUp(e: PointerEvent) {
    if (this.pointerId !== e.pointerId) return;
    this.pointerId = null;
    this.input.set(0, 0);
    this.visible = false;
  }
}
