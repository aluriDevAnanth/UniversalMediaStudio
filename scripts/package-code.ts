import fs from "fs";
import path from "path";
const archiver = require("archiver");
const ignore = require("ignore");

// 1. Read project name from package.json
const rootDir = process.cwd();
const pkgPath = path.join(rootDir, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
const projectName = pkg.name || "Project";

// 2. Format timestamp: yyyy_mm_dd_hh_mm_ss and full day name
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
const zipFileName = `${projectName}_${dateStr}_${fullDay}.zip`;
const outputPath = path.resolve(rootDir, "..", zipFileName);

console.log(`📦 Packaging code for: ${projectName}`);
console.log(`📅 Timestamp: ${dateStr}`);
console.log(`📆 Day: ${fullDay}`);
console.log(`📁 Target Zip (Outside Root): ${outputPath}\n`);

// 3. Setup gitignore parser
const ig = ignore();

// Always exclude .git folder, node_modules, and zip outputs
ig.add([".git", ".git/**", "node_modules", "node_modules/**", zipFileName, "*.zip"]);

const gitignorePath = path.join(rootDir, ".gitignore");
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
  ig.add(gitignoreContent);
}

// 4. Traversal function to collect non-ignored files
function getFilesToArchive(dir: string, baseDir: string = dir): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

    const isDir = entry.isDirectory();
    const testPath = isDir ? `${relativePath}/` : relativePath;

    // Skip if matched by gitignore
    if (ig.ignores(testPath) || ig.ignores(relativePath)) {
      continue;
    }

    if (isDir) {
      files = files.concat(getFilesToArchive(fullPath, baseDir));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}

const filesToZip = getFilesToArchive(rootDir);
console.log(`🔍 Found ${filesToZip.length} files to package (respecting .gitignore)...`);

// 5. Build zip archive
const archiverModule = require("archiver");
const outputStream = fs.createWriteStream(outputPath);
const archive = new archiverModule.ZipArchive({ zlib: { level: 9 } });

outputStream.on("close", () => {
  const sizeMB = (archive.pointer() / (1024 * 1024)).toFixed(2);
  console.log(`\n✅ Code package created successfully!`);
  console.log(`📄 Filename: ${zipFileName}`);
  console.log(`📂 Output Path: "${outputPath}"`);
  console.log(`📊 Size: ${sizeMB} MB (${archive.pointer().toLocaleString()} bytes)`);
});

archive.on("error", (err: any) => {
  console.error("❌ Archiving failed:", err);
  process.exit(1);
});

archive.pipe(outputStream);

for (const relPath of filesToZip) {
  const absolutePath = path.join(rootDir, relPath);
  archive.file(absolutePath, { name: relPath });
}

archive.finalize();
