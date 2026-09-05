import { describe, it, expect } from "bun:test";
import fs from "fs";
import path from "path";

describe("Project Configuration & Automation Scripts", () => {
  const rootDir = path.resolve(__dirname, "..");

  it("should have a valid package.json with required fields and scripts", () => {
    const pkgPath = path.join(rootDir, "package.json");
    expect(fs.existsSync(pkgPath)).toBe(true);

    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    expect(pkg.name).toBe("UniversalMediaStudio");
    expect(pkg.version).toBeDefined();

    expect(pkg.scripts.dev).toBeDefined();
    expect(pkg.scripts.build).toBeDefined();
    expect(pkg.scripts["typecheck:node"]).toBeDefined();
    expect(pkg.scripts["typecheck:web"]).toBeDefined();
    expect(pkg.scripts.startup).toBeDefined();
    expect(pkg.scripts.test).toBeDefined();
  });

  it("should have all startup automation pipeline scripts present in scripts/ folder", () => {
    const startupTs = path.join(rootDir, "scripts", "startup.ts");
    const startupPs1 = path.join(rootDir, "scripts", "startup.ps1");
    const startupSh = path.join(rootDir, "scripts", "startup.sh");
    const packageCodeTs = path.join(rootDir, "scripts", "package-code.ts");

    expect(fs.existsSync(startupTs)).toBe(true);
    expect(fs.existsSync(startupPs1)).toBe(true);
    expect(fs.existsSync(startupSh)).toBe(true);
    expect(fs.existsSync(packageCodeTs)).toBe(true);
  });

  it("should have valid tsconfig configurations for node and web", () => {
    const tsconfigNode = path.join(rootDir, "tsconfig.node.json");
    const tsconfigWeb = path.join(rootDir, "tsconfig.web.json");

    expect(fs.existsSync(tsconfigNode)).toBe(true);
    expect(fs.existsSync(tsconfigWeb)).toBe(true);

    const nodeCfg = JSON.parse(fs.readFileSync(tsconfigNode, "utf-8"));
    const webCfg = JSON.parse(fs.readFileSync(tsconfigWeb, "utf-8"));

    expect(nodeCfg.include).toBeDefined();
    expect(webCfg.include).toBeDefined();
  });
});
