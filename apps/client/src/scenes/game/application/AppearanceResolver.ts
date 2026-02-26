/**
 * AppearanceResolver
 * teamId から見た目リソースを解決する責務を集約する
 * プレイヤー画像，塗り色，unknown のフォールバック規約を統一する
 */
import { config as sharedConfig } from "@repo/shared";
import { config } from "@client/config";

/** チーム由来の見た目解決を提供するリゾルバー */
export class AppearanceResolver {
  private static readonly TEAM_CHARACTER_IMAGE_FILES = [
    "red.svg",
    "blue.svg",
    "green.svg",
    "yellow.svg",
  ] as const;

  private readonly cachedTeamColors: number[];

  constructor() {
    this.cachedTeamColors = config.GAME_CONFIG.TEAM_COLORS.map((colorCode) => this.parseColorCode(colorCode));
  }

  /** teamId からプレイヤー画像ファイル名を解決する */
  public resolvePlayerImageFile(teamId: number): string {
    const { TEAM_COUNT } = config.GAME_CONFIG;
    const imageFiles = AppearanceResolver.TEAM_CHARACTER_IMAGE_FILES;

    config.validateTeamConfig();

    if (imageFiles.length !== TEAM_COUNT) {
      throw new Error(
        `GAME_CONFIG mismatch: imageFiles length (${imageFiles.length}) must equal TEAM_COUNT (${TEAM_COUNT})`,
      );
    }

    if (!this.isKnownTeamId(teamId)) {
      return imageFiles[0];
    }

    return imageFiles[teamId] ?? imageFiles[0];
  }

  /** teamId からチーム色を解決する */
  public resolveTeamColor(teamId: number): number {
    if (!this.isKnownTeamId(teamId)) {
      return config.GAME_CONFIG.MAP_GRID_COLOR;
    }

    const teamColor = this.cachedTeamColors[teamId];
    if (!Number.isInteger(teamColor)) {
      return config.GAME_CONFIG.MAP_GRID_COLOR;
    }

    return teamColor;
  }

  /** teamId からマップセル色を解決する，unknown は未塗り扱いにする */
  public resolveMapCellColor(teamId: number): number | null {
    if (teamId === sharedConfig.UNKNOWN_TEAM_ID) {
      return null;
    }

    return this.resolveTeamColor(teamId);
  }

  private isKnownTeamId(teamId: number): boolean {
    return Number.isInteger(teamId)
      && teamId >= 0
      && teamId < config.GAME_CONFIG.TEAM_COUNT;
  }

  private parseColorCode(colorCode: string): number {
    const normalizedColorCode = colorCode.startsWith("#")
      ? colorCode.slice(1)
      : colorCode;

    const parsedColor = Number.parseInt(normalizedColorCode, 16);
    if (Number.isNaN(parsedColor)) {
      return config.GAME_CONFIG.MAP_GRID_COLOR;
    }

    return parsedColor;
  }
}
