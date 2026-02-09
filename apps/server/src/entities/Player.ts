// src/entities/Player.ts
export class Player {
  public id: string;
  public x: number;
  public y: number;
  public color: string;

  constructor(id: string) {
    this.id = id;
    this.x = 0;
    this.y = 0;
    // ランダムな色をつけるとおしゃれです
    this.color = '#' + Math.floor(Math.random()*16777215).toString(16);
  }
}