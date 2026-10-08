/**
 * paths.test
 * 出力ディレクトリ名の日時表記と出力先の決定を検証するユニットテスト
 * .claude/verify-profile.md「実行コマンド」節を基準とする
 * - 出力先は run-<YYYYMMDD-HHMMSS>/ で，実行ごとに別ディレクトリ（前回の証拠を上書きしない）
 * - .verify/ 配下のシナリオはそのディレクトリ，コミット済みシナリオは .verify/_scenarios/<シナリオ名>/ に出力する
 */
import path from "node:path";
import { describe, expect, it } from "vitest";

import { VERIFY_OUTPUT_ROOT, formatRunStamp, resolveRunOutDir } from "./paths.mjs";

const ROOT = path.join(path.sep, "repo", ".verify");
const STAMP = "20261008-040506";

/**
 * 指定したパスだけが存在するとみなす exists を生成する
 * @param {string[]} existing
 */
const existsOnly = (existing) => {
  const set = new Set(existing);
  return (/** @type {string} */ target) => set.has(target);
};

describe("formatRunStamp", () => {
  it("YYYYMMDD-HHMMSS 形式で返すこと", () => {
    expect(formatRunStamp(new Date(2026, 9, 8, 14, 35, 59))).toBe("20261008-143559");
  });

  it("1 桁の月・日・時・分・秒をゼロ埋めすること", () => {
    expect(formatRunStamp(new Date(2026, 0, 2, 3, 4, 5))).toBe("20260102-030405");
  });

  it("月を 1 始まりで表すこと（12 月）", () => {
    expect(formatRunStamp(new Date(2026, 11, 31, 23, 59, 59))).toBe("20261231-235959");
  });

  it("0 時 0 分 0 秒を 000000 と表すこと", () => {
    expect(formatRunStamp(new Date(2026, 4, 5, 0, 0, 0))).toBe("20260505-000000");
  });

  it("ミリ秒を含めないこと", () => {
    expect(formatRunStamp(new Date(2026, 4, 5, 1, 2, 3, 999))).toBe("20260505-010203");
  });

  it("15 文字の数字とハイフンのみで構成されること", () => {
    expect(formatRunStamp(new Date())).toMatch(/^\d{8}-\d{6}$/);
  });
});

describe("resolveRunOutDir", () => {
  describe("出力先の基準ディレクトリ", () => {
    it(".verify 配下のシナリオはシナリオのディレクトリに run-<日時> を作ること", () => {
      const scenarioPath = path.join(ROOT, "lobby-check", "scenario.mjs");

      expect(
        resolveRunOutDir({ scenarioPath, stamp: STAMP, verifyOutputRoot: ROOT, exists: () => false }),
      ).toBe(path.join(ROOT, "lobby-check", `run-${STAMP}`));
    });

    it("コミット済みシナリオは .verify/_scenarios/<シナリオ名>/run-<日時> に出力すること", () => {
      const scenarioPath = path.join(path.sep, "repo", "scripts", "verify", "scenarios", "sample-match.mjs");

      expect(
        resolveRunOutDir({ scenarioPath, stamp: STAMP, verifyOutputRoot: ROOT, exists: () => false }),
      ).toBe(path.join(ROOT, "_scenarios", "sample-match", `run-${STAMP}`));
    });

    it("シナリオ名から拡張子 .mjs を除くこと", () => {
      const scenarioPath = path.join(path.sep, "tmp", "my-check.mjs");

      expect(
        path.basename(
          path.dirname(
            resolveRunOutDir({ scenarioPath, stamp: STAMP, verifyOutputRoot: ROOT, exists: () => false }),
          ),
        ),
      ).toBe("my-check");
    });

    it("名前が .verify で始まる別ディレクトリ（.verify-old）は .verify 配下とみなさないこと", () => {
      const scenarioPath = path.join(path.sep, "repo", ".verify-old", "x", "scenario.mjs");

      expect(
        resolveRunOutDir({ scenarioPath, stamp: STAMP, verifyOutputRoot: ROOT, exists: () => false }),
      ).toBe(path.join(ROOT, "_scenarios", "scenario", `run-${STAMP}`));
    });

    it("verifyOutputRoot を省略した場合はリポジトリの .verify を基準にすること", () => {
      const scenarioPath = path.join(path.sep, "elsewhere", "sample.mjs");

      expect(resolveRunOutDir({ scenarioPath, stamp: STAMP, exists: () => false })).toBe(
        path.join(VERIFY_OUTPUT_ROOT, "_scenarios", "sample", `run-${STAMP}`),
      );
    });
  });

  describe("同じ秒の再実行（前回を上書きしない）", () => {
    const scenarioPath = path.join(ROOT, "lobby-check", "scenario.mjs");
    const base = path.join(ROOT, "lobby-check");

    it("同名の出力先が無ければ連番を付けないこと", () => {
      expect(
        resolveRunOutDir({ scenarioPath, stamp: STAMP, verifyOutputRoot: ROOT, exists: existsOnly([]) }),
      ).toBe(path.join(base, `run-${STAMP}`));
    });

    it("run-<日時> が既にあれば -2 を付けること", () => {
      expect(
        resolveRunOutDir({
          scenarioPath,
          stamp: STAMP,
          verifyOutputRoot: ROOT,
          exists: existsOnly([path.join(base, `run-${STAMP}`)]),
        }),
      ).toBe(path.join(base, `run-${STAMP}-2`));
    });

    it("-2 も既にあれば -3 を付けること", () => {
      expect(
        resolveRunOutDir({
          scenarioPath,
          stamp: STAMP,
          verifyOutputRoot: ROOT,
          exists: existsOnly([path.join(base, `run-${STAMP}`), path.join(base, `run-${STAMP}-2`)]),
        }),
      ).toBe(path.join(base, `run-${STAMP}-3`));
    });

    it("連番が埋まっている限り次の空き番号まで進むこと", () => {
      const existing = [path.join(base, `run-${STAMP}`)];
      for (let suffix = 2; suffix <= 10; suffix += 1) {
        existing.push(path.join(base, `run-${STAMP}-${suffix}`));
      }

      expect(
        resolveRunOutDir({ scenarioPath, stamp: STAMP, verifyOutputRoot: ROOT, exists: existsOnly(existing) }),
      ).toBe(path.join(base, `run-${STAMP}-11`));
    });

    it("コミット済みシナリオでも同じ秒の再実行で -2 を付けること", () => {
      const committed = path.join(path.sep, "repo", "scripts", "verify", "scenarios", "sample-match.mjs");
      const committedBase = path.join(ROOT, "_scenarios", "sample-match");

      expect(
        resolveRunOutDir({
          scenarioPath: committed,
          stamp: STAMP,
          verifyOutputRoot: ROOT,
          exists: existsOnly([path.join(committedBase, `run-${STAMP}`)]),
        }),
      ).toBe(path.join(committedBase, `run-${STAMP}-2`));
    });

    it("別の日時の出力先があっても連番を付けないこと", () => {
      expect(
        resolveRunOutDir({
          scenarioPath,
          stamp: STAMP,
          verifyOutputRoot: ROOT,
          exists: existsOnly([path.join(base, "run-20261008-040505")]),
        }),
      ).toBe(path.join(base, `run-${STAMP}`));
    });

    it("返す出力先は exists が偽を返したパスであること", () => {
      const checked = /** @type {string[]} */ ([]);
      const result = resolveRunOutDir({
        scenarioPath,
        stamp: STAMP,
        verifyOutputRoot: ROOT,
        exists: (target) => {
          checked.push(target);
          return checked.length < 3;
        },
      });

      expect(result).toBe(checked[checked.length - 1]);
    });
  });
});
