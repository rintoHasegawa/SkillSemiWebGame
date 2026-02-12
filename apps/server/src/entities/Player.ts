// src/entities/Player.ts
export class Player {
  public id: string;
  public x: number = 0;
  public y: number = 0;
  public color: string;

  constructor(id: string) {
    this.id = id;
    /*
    this.x = Math.floor(Math.random() * 1000) + 500; 
    this.y = Math.floor(Math.random() * 1000) + 500;
    */
    // ランダムな色をつけるとおしゃれです
    this.color = '#' + Math.floor(Math.random()*16777215).toString(16);
  }
}