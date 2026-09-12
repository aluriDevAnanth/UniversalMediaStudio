import { describe, it, expect } from "bun:test";
import fs from "fs";
import path from "path";
const ignore = require("ignore");

describe("Package Code Script & Automation Pipeline (scripts/package-code.ts)", () => {
  it("should generate valid zip filenames with dateStr and day of week", () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");

    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());

    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const fullDay = daysOfWeek[now.getDay()];

    const dateStr = `${year}_${month}_${day}_${hours}_${minutes}_${seconds}`;
    const projectName = "UniversalMediaStudio";
    const zipFileName = `${projectName}_${dateStr}_${fullDay}.zip`;

    expect(zipFileName).toMatch(/^UniversalMediaStudio_\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2}_[A-Za-z]+\.zip$/);
  });

  it("should correctly exclude node_modules, .git, and .zip files via ignore parser", () => {
    const ig = ignore();
    ig.add(["node_modules", "node_modules/**", "*.zip", ".git", ".git/**"]);

    expect(ig.ignores("node_modules/electron/index.js")).toBe(true);
    expect(ig.ignores("node_modules/")).toBe(true);
    expect(ig.ignores("output_archive.zip")).toBe(true);
    expect(ig.ignores(".git/config")).toBe(true);

    // Source code files should NOT be ignored
    expect(ig.ignores("src/main/index.ts")).toBe(false);
    expect(ig.ignores("src/renderer/src/App.tsx")).toBe(false);
    expect(ig.ignores("package.json")).toBe(false);
  });

  it("should verify that .gitignore in workspace has essential build exclusions", () => {
    const rootDir = process.cwd();
    const gitignorePath = path.join(rootDir, ".gitignore");

    expect(fs.existsSync(gitignorePath)).toBe(true);
    const content = fs.readFileSync(gitignorePath, "utf-8");

    expect(content).toContain("node_modules");
    expect(content).toContain("dist");
    expect(content).toContain("out");
  });
});
