import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const [, , tsconfigPath, allowlistPath, ...restArgs] = process.argv;

if (!tsconfigPath || !allowlistPath) {
  console.error(
    "Usage: node scripts/ts-prune-filter.mjs <tsconfigPath> <allowlistPath> [--fail-on-findings]",
  );
  process.exit(2);
}

const failOnFindings = restArgs.includes("--fail-on-findings");

const allowlist = JSON.parse(readFileSync(allowlistPath, "utf8"));
const ignoreFiles = new Set(allowlist.ignoreFiles ?? []);
const ignoreExports = new Set(allowlist.ignoreExports ?? []);

const run = spawnSync(
  "pnpm",
  ["dlx", "ts-prune", "-p", tsconfigPath],
  { encoding: "utf8" },
);

if (run.error) {
  console.error(run.error.message);
  process.exit(2);
}

const stdout = run.stdout ?? "";
const stderr = run.stderr ?? "";
if (stderr.trim()) {
  process.stderr.write(stderr);
}

const lines = stdout
  .split("\n")
  .map((line) => line.trimEnd())
  .filter((line) => line.length > 0);

const findings = lines.filter((line) => {
  const match = line.match(/^(.+?):\d+\s+-\s+([^\s].*?)\s*(?:\(used in module\))?$/);
  if (!match) {
    return true;
  }

  const filePath = match[1];
  const symbolName = match[2];
  if (ignoreFiles.has(filePath)) {
    return false;
  }

  return !ignoreExports.has(`${filePath}#${symbolName}`);
});

if (findings.length > 0) {
  process.stdout.write(`${findings.join("\n")}\n`);
}

if (failOnFindings && findings.length > 0) {
  process.exit(1);
}

process.exit(0);