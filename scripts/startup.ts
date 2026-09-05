import fs from "fs";
import path from "path";
import { execSync, spawn } from "child_process";

// ─── ANSI Styling & Helpers ───────────────────────────────────────────────────

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
};

function banner(text: string) {
  const line = "═".repeat(60);
  console.log(`\n${colors.cyan}${colors.bold}╔${line}╗`);
  console.log(`║ ${text.padEnd(58)} ║`);
  console.log(`╚${line}╝${colors.reset}\n`);
}

function logStep(step: number, total: number, title: string) {
  console.log(
    `\n${colors.magenta}${colors.bold}[Step ${step}/${total}]${colors.reset} ${colors.bold}${title}${colors.reset}`,
  );
  console.log(`${colors.gray}${"─".repeat(50)}${colors.reset}`);
}

function logSuccess(msg: string) {
  console.log(`${colors.green}✔ ${msg}${colors.reset}`);
}

function logInfo(msg: string) {
  console.log(`${colors.blue}ℹ ${msg}${colors.reset}`);
}

function logWarn(msg: string) {
  console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`);
}

function logError(msg: string) {
  console.log(`${colors.red}✖ ${msg}${colors.reset}`);
}

// ─── Environment & CLI Arguments ──────────────────────────────────────────────

const rootDir = path.resolve(__dirname, "..");
const args = process.argv.slice(2);

const isClean = args.includes("--clean") || args.includes("-c");
const isBuild = args.includes("--build") || args.includes("-b");
const isDev = args.includes("--dev") || args.includes("-d") || (!isBuild && !args.includes("--check-only"));
const isCheckOnly = args.includes("--check-only");

// ─── Package Manager Detection ────────────────────────────────────────────────

function detectPackageManager(): "bun" | "npm" | "pnpm" | "yarn" {
  try {
    execSync("bun --version", { stdio: "ignore" });
    return "bun";
  } catch {
    try {
      execSync("pnpm --version", { stdio: "ignore" });
      return "pnpm";
    } catch {
      try {
        execSync("yarn --version", { stdio: "ignore" });
        return "yarn";
      } catch {
        return "npm";
      }
    }
  }
}

// ─── Main Pipeline ────────────────────────────────────────────────────────────

async function runPipeline() {
  const startTime = Date.now();
  const TOTAL_STEPS = 6;
  let currentStep = 1;

  banner("UniversalMediaStudio • Post-Clone Startup Pipeline");

  // ── Step 1: Scan & Parse package.json ────────────────────────────────────────
  logStep(currentStep++, TOTAL_STEPS, "Scanning package.json Configuration");

  const pkgPath = path.join(rootDir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    logError(`package.json not found in root directory: ${rootDir}`);
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const deps = Object.keys(pkg.dependencies || {});
  const devDeps = Object.keys(pkg.devDependencies || {});
  const scripts = Object.keys(pkg.scripts || {});

  console.log(`${colors.dim}Project Name:${colors.reset}    ${colors.bold}${pkg.name || "N/A"}${colors.reset}`);
  console.log(`${colors.dim}Version:${colors.reset}         ${pkg.version || "1.0.0"}`);
  console.log(`${colors.dim}Description:${colors.reset}     ${pkg.description || "N/A"}`);
  console.log(`${colors.dim}Dependencies:${colors.reset}    ${deps.length} packages`);
  console.log(`${colors.dim}DevDependencies:${colors.reset} ${devDeps.length} packages`);
  console.log(`${colors.dim}Defined Scripts:${colors.reset} ${scripts.join(", ")}`);

  const pkgManager = detectPackageManager();
  logSuccess(`Detected package manager: ${colors.bold}${pkgManager}${colors.reset}`);

  // ── Step 2: Clean Cache (Optional) ──────────────────────────────────────────
  logStep(currentStep++, TOTAL_STEPS, "Validating Working Directory & Caches");

  if (isClean) {
    logInfo("Cleaning node_modules, build outputs, and Vite caches...");
    const pathsToClean = [
      path.join(rootDir, "node_modules"),
      path.join(rootDir, "out"),
      path.join(rootDir, "dist"),
      path.join(rootDir, "node_modules", ".vite"),
    ];

    for (const p of pathsToClean) {
      if (fs.existsSync(p)) {
        fs.rmSync(p, { recursive: true, force: true });
        logInfo(`Removed: ${path.relative(rootDir, p)}`);
      }
    }
    logSuccess("Clean completed.");
  } else {
    logInfo("Preserving existing module caches (use --clean to wipe and reinstall).");
  }

  // ── Step 3: Install Dependencies ────────────────────────────────────────────
  logStep(currentStep++, TOTAL_STEPS, "Installing Dependencies");

  const installCmd =
    pkgManager === "bun"
      ? "bun install"
      : pkgManager === "pnpm"
        ? "pnpm install"
        : pkgManager === "yarn"
          ? "yarn install"
          : "npm install";

  logInfo(`Running: ${colors.cyan}${installCmd}${colors.reset} ...`);
  try {
    execSync(installCmd, { cwd: rootDir, stdio: "inherit" });
    logSuccess("Dependencies installed successfully.");
  } catch (err) {
    logError(`Dependency installation failed: ${err}`);
    process.exit(1);
  }

  // ── Step 4: Verify Electron Binary Installation ─────────────────────────────
  logStep(currentStep++, TOTAL_STEPS, "Verifying Electron Runtime Binary");

  const electronInstallScript = path.join(rootDir, "node_modules", "electron", "install.js");
  if (fs.existsSync(electronInstallScript)) {
    try {
      logInfo("Ensuring Electron target platform binaries are in place...");
      execSync(`node "${electronInstallScript}"`, { cwd: rootDir, stdio: "inherit" });
      logSuccess("Electron binary is ready.");
    } catch (err) {
      logWarn(`Electron binary check encountered a warning: ${err}`);
    }
  } else {
    logWarn("Electron install script not found. Skipping binary verification.");
  }

  // ── Step 5: TypeScript Compilation & Type Safety Verification ───────────────
  logStep(currentStep++, TOTAL_STEPS, "Running Typecheck Pipeline");

  // Check Node / Main & Preload
  try {
    logInfo("Checking Main & Preload types (tsconfig.node.json)...");
    const cmd = pkgManager === "bun" ? "bun run typecheck:node" : "npm run typecheck:node";
    execSync(cmd, { cwd: rootDir, stdio: "inherit" });
    logSuccess("Main & Preload type check passed.");
  } catch {
    logError("Main / Preload type check failed.");
    process.exit(1);
  }

  // Check Web / Renderer
  try {
    logInfo("Checking Renderer React types (tsconfig.web.json)...");
    const cmd = pkgManager === "bun" ? "bun run typecheck:web" : "npm run typecheck:web";
    execSync(cmd, { cwd: rootDir, stdio: "inherit" });
    logSuccess("Renderer UI type check passed.");
  } catch {
    logError("Renderer UI type check failed.");
    process.exit(1);
  }

  // Check Resource Assets
  const iconPath = path.join(rootDir, "resources", "icon.ico");
  if (!fs.existsSync(iconPath)) {
    logWarn(`Application icon not found at ${path.relative(rootDir, iconPath)}`);
  } else {
    logSuccess("Application resources validated.");
  }

  // ── Step 6: Launch Application / Build ───────────────────────────────────────
  logStep(currentStep++, TOTAL_STEPS, "Execution Phase");

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${colors.green}${colors.bold}✨ Pipeline completed in ${elapsedSec}s!${colors.reset}\n`);

  if (isCheckOnly) {
    logSuccess("Environment verification complete. Exiting (--check-only flag provided).");
    return;
  }

  if (isBuild) {
    logInfo("Building production distribution bundle...");
    const buildCmd = pkgManager === "bun" ? "bun run build" : "npm run build";
    execSync(buildCmd, { cwd: rootDir, stdio: "inherit" });
    logSuccess("Production build finished successfully in ./out");
    return;
  }

  if (isDev) {
    logInfo(`Starting Electron + Vite development server (${pkgManager} run dev)...`);
    const devCmd = pkgManager === "bun" ? "bun" : pkgManager;
    const devArgs = pkgManager === "bun" ? ["run", "dev"] : ["run", "dev"];

    const child = spawn(devCmd, devArgs, {
      cwd: rootDir,
      stdio: "inherit",
      shell: true,
    });

    child.on("close", (code) => {
      console.log(`\nDevelopment server exited with code ${code}`);
    });
  }
}

// Run pipeline
runPipeline().catch((err) => {
  logError(`Fatal setup error: ${err}`);
  process.exit(1);
});
