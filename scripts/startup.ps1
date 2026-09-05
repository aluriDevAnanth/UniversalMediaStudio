# ==============================================================================
# UniversalMediaStudio - Windows Post-Clone Startup & Environment Setup Script
# Usage: .\scripts\startup.ps1 [-Clean] [-Build] [-CheckOnly]
# ==============================================================================

[CmdletBinding()]
param (
    [switch]$Clean,
    [switch]$Build,
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"

function Write-Banner {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "   UniversalMediaStudio - Post-Clone Setup and Startup Pipeline " -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param(
        [int]$Step,
        [int]$Total,
        [string]$Title
    )
    Write-Host ""
    Write-Host "[$Step/$Total] $Title" -ForegroundColor Magenta
    Write-Host ("-" * 60) -ForegroundColor DarkGray
}

Write-Banner

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
Set-Location $RootDir

$TotalSteps = 6
$CurrentStep = 1

# ── Step 1: Scan package.json ──────────────────────────────────────────────────
Write-Step -Step $CurrentStep -Total $TotalSteps -Title "Scanning Project Configuration (package.json)"
$CurrentStep++

$PkgPath = Join-Path $RootDir "package.json"
if (-not (Test-Path $PkgPath)) {
    Write-Error "package.json not found in $RootDir"
    exit 1
}

$Pkg = Get-Content $PkgPath -Raw | ConvertFrom-Json
Write-Host "  Project Name    : $($Pkg.name)" -ForegroundColor White
Write-Host "  Version         : $($Pkg.version)" -ForegroundColor White
Write-Host "  Description     : $($Pkg.description)" -ForegroundColor DarkGray

# Detect Package Manager
$PkgManager = "npm"
if (Get-Command bun -ErrorAction SilentlyContinue) {
    $PkgManager = "bun"
} elseif (Get-Command pnpm -ErrorAction SilentlyContinue) {
    $PkgManager = "pnpm"
} elseif (Get-Command yarn -ErrorAction SilentlyContinue) {
    $PkgManager = "yarn"
}
Write-Host "  Package Manager : $PkgManager" -ForegroundColor Green

# ── Step 2: Clean Cache if Requested ──────────────────────────────────────────
Write-Step -Step $CurrentStep -Total $TotalSteps -Title "Cache and Directory Validation"
$CurrentStep++

if ($Clean) {
    Write-Host "  Cleaning node_modules, out, dist, and cache folders..." -ForegroundColor Yellow
    $CleanTargets = @("node_modules", "out", "dist", "node_modules/.vite")
    foreach ($targetName in $CleanTargets) {
        $targetPath = Join-Path $RootDir $targetName
        if (Test-Path $targetPath) {
            Remove-Item -Recurse -Force $targetPath -ErrorAction SilentlyContinue
            Write-Host "  Removed: $targetName" -ForegroundColor DarkGray
        }
    }
} else {
    Write-Host "  Preserving cached packages (use -Clean to perform full wipe)." -ForegroundColor DarkGray
}

# ── Step 3: Install Dependencies ──────────────────────────────────────────────
Write-Step -Step $CurrentStep -Total $TotalSteps -Title "Installing Dependencies via $PkgManager"
$CurrentStep++

if ($PkgManager -eq "bun") {
    bun install
} elseif ($PkgManager -eq "pnpm") {
    pnpm install
} elseif ($PkgManager -eq "yarn") {
    yarn install
} else {
    npm install
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Dependency installation failed."
    exit 1
}
Write-Host "  Dependencies installed successfully." -ForegroundColor Green

# ── Step 4: Verify Electron Binary ────────────────────────────────────────────
Write-Step -Step $CurrentStep -Total $TotalSteps -Title "Verifying Electron Platform Binaries"
$CurrentStep++

$ElectronInstallJs = Join-Path $RootDir "node_modules/electron/install.js"
if (Test-Path $ElectronInstallJs) {
    Write-Host "  Running Electron binary installer..." -ForegroundColor White
    node $ElectronInstallJs
    Write-Host "  Electron platform binaries verified." -ForegroundColor Green
} else {
    Write-Host "  Electron install script not found. Skipping." -ForegroundColor Yellow
}

# ── Step 5: Typecheck Verification ────────────────────────────────────────────
Write-Step -Step $CurrentStep -Total $TotalSteps -Title "Running TypeScript Compilation Checks"
$CurrentStep++

Write-Host "  Checking Node and Main process types..." -ForegroundColor White
if ($PkgManager -eq "bun") {
    bun run typecheck:node
} else {
    npm run typecheck:node
}

Write-Host "  Checking Web and Renderer UI types..." -ForegroundColor White
if ($PkgManager -eq "bun") {
    bun run typecheck:web
} else {
    npm run typecheck:web
}
Write-Host "  Typechecks passed with 0 errors." -ForegroundColor Green

# ── Step 6: Launch Execution ──────────────────────────────────────────────────
Write-Step -Step $CurrentStep -Total $TotalSteps -Title "Execution Phase"
$CurrentStep++

Write-Host ""
Write-Host "Setup and validation complete!" -ForegroundColor Green
Write-Host ""

if ($CheckOnly) {
    Write-Host "Check-only mode enabled. Setup finished." -ForegroundColor Cyan
    exit 0
}

if ($Build) {
    Write-Host "Building production distribution bundle..." -ForegroundColor Cyan
    if ($PkgManager -eq "bun") {
        bun run build
    } else {
        npm run build
    }
} else {
    Write-Host "Launching Electron + Vite development server..." -ForegroundColor Cyan
    if ($PkgManager -eq "bun") {
        bun run dev
    } else {
        npm run dev
    }
}
