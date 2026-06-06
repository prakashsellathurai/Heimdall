import "./setup";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  bumpSemver,
  detectIndent,
  isGreaterVersion,
  parseArgs,
  parseSemver,
  setVersionInFile,
} from "../scripts/bump-version";

describe("parseSemver", () => {
  it("parses a normal semver", () => {
    expect(parseSemver("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it("parses zero versions", () => {
    expect(parseSemver("0.0.0")).toEqual({ major: 0, minor: 0, patch: 0 });
  });

  it("rejects missing components", () => {
    expect(() => parseSemver("1.2")).toThrow();
  });

  it("rejects non-numeric", () => {
    expect(() => parseSemver("1.2.x")).toThrow();
  });

  it("rejects pre-release tags", () => {
    expect(() => parseSemver("1.2.3-beta")).toThrow();
  });
});

describe("bumpSemver", () => {
  it("bumps patch", () => {
    expect(bumpSemver("1.2.3", "patch")).toBe("1.2.4");
  });

  it("bumps minor (resets patch)", () => {
    expect(bumpSemver("1.2.3", "minor")).toBe("1.3.0");
  });

  it("bumps major (resets minor and patch)", () => {
    expect(bumpSemver("1.2.3", "major")).toBe("2.0.0");
  });

  it("rolls over patch at 9", () => {
    expect(bumpSemver("1.2.9", "patch")).toBe("1.2.10");
  });

  it("rolls over minor carrying patch", () => {
    expect(bumpSemver("1.9.7", "minor")).toBe("1.10.0");
  });
});

describe("isGreaterVersion", () => {
  it("detects patch-level increase", () => {
    expect(isGreaterVersion("1.2.4", "1.2.3")).toBe(true);
  });

  it("detects equal versions", () => {
    expect(isGreaterVersion("1.2.3", "1.2.3")).toBe(false);
  });

  it("detects lower version", () => {
    expect(isGreaterVersion("1.2.2", "1.2.3")).toBe(false);
  });

  it("detects major-level increase", () => {
    expect(isGreaterVersion("2.0.0", "1.99.99")).toBe(true);
  });
});

describe("detectIndent", () => {
  it("detects 2-space indent", () => {
    const raw = '{\n  "name": "x",\n  "version": "1.0.0"\n}\n';
    expect(detectIndent(raw)).toBe(2);
  });

  it("detects 4-space indent", () => {
    const raw = '{\n    "name": "x",\n    "version": "1.0.0"\n}\n';
    expect(detectIndent(raw)).toBe(4);
  });

  it("defaults to 2 when no indented line found", () => {
    const raw = '{"name":"x"}';
    expect(detectIndent(raw)).toBe(2);
  });
});

describe("setVersionInFile", () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "bump-"));
    file = join(dir, "manifest.json");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("updates the top-level version preserving 2-space indent", () => {
    const before =
      '{\n  "manifest_version": 3,\n  "name": "heimdall",\n  "version": "1.2.0"\n}\n';
    writeFileSync(file, before);
    setVersionInFile(file, "1.2.0", "1.2.1");
    const after = readFileSync(file, "utf-8");
    expect(after).toContain('"version": "1.2.1"');
    expect(after).not.toContain('"version": "1.2.0"');
    expect(after.indexOf('"version": "1.2.1"')).toBeGreaterThan(0);
  });

  it("updates the top-level version preserving 4-space indent", () => {
    const before = '{\n    "name": "heimdall",\n    "version": "1.2.0"\n}\n';
    writeFileSync(file, before);
    setVersionInFile(file, "1.2.0", "2.0.0");
    const after = readFileSync(file, "utf-8");
    expect(after).toContain('    "version": "2.0.0"');
  });

  it("throws if current version does not match expected", () => {
    const before = '{\n  "version": "9.9.9"\n}\n';
    writeFileSync(file, before);
    expect(() => setVersionInFile(file, "1.2.0", "1.2.1")).toThrow();
  });

  it("throws if there is no top-level version field", () => {
    const before = '{\n  "name": "heimdall"\n}\n';
    writeFileSync(file, before);
    expect(() => setVersionInFile(file, "1.2.0", "1.2.1")).toThrow();
  });

  it("does not touch nested version-looking strings", () => {
    const before =
      '{\n  "version": "1.2.0",\n  "browser_specific_settings": {\n    "gecko": {\n      "strict_min_version": "109.0"\n    }\n  }\n}\n';
    writeFileSync(file, before);
    setVersionInFile(file, "1.2.0", "1.2.1");
    const after = readFileSync(file, "utf-8");
    expect(after).toContain('"strict_min_version": "109.0"');
    expect(after).toContain('"version": "1.2.1"');
  });
});

describe("parseArgs", () => {
  it("parses an explicit version", () => {
    expect(parseArgs(["1.2.1"])).toEqual({
      version: "1.2.1",
      bumpType: undefined,
      dryRun: false,
    });
  });

  it("parses a bump type", () => {
    expect(parseArgs(["patch"])).toEqual({
      version: undefined,
      bumpType: "patch",
      dryRun: false,
    });
  });

  it("parses --dry-run with an explicit version", () => {
    expect(parseArgs(["1.2.1", "--dry-run"])).toEqual({
      version: "1.2.1",
      bumpType: undefined,
      dryRun: true,
    });
  });

  it("parses --dry-run before the positional", () => {
    expect(parseArgs(["--dry-run", "minor"])).toEqual({
      version: undefined,
      bumpType: "minor",
      dryRun: true,
    });
  });

  it("rejects an unknown bump type", () => {
    expect(() => parseArgs(["hotfix"])).toThrow();
  });

  it("rejects an invalid version string", () => {
    expect(() => parseArgs(["1.2"])).toThrow();
  });
});
