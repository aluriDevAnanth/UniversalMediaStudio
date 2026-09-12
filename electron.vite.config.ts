import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react-swc";
import fs from "fs";
import { resolve } from "path";
import tailwindcss from "@tailwindcss/vite";

function copySqliteWasmPlugin() {
  return {
    name: "copy-sqlite-wasm",
    writeBundle() {
      try {
        const wasmSrc = resolve(__dirname, "node_modules/sql.js/dist/sql-wasm.wasm");
        const outDir = resolve(__dirname, "out/main");
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }
        if (fs.existsSync(wasmSrc)) {
          fs.copyFileSync(wasmSrc, resolve(outDir, "sql-wasm.wasm"));
        }
      } catch (e) {
        console.error("Failed to copy sql-wasm.wasm:", e);
      }
    },
  };
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copySqliteWasmPlugin()],
    build: {
      rollupOptions: {
        external: ["electron"],
        input: {
          index: resolve(__dirname, "src/main/index.ts"),
        },
        output: {
          entryFileNames: "[name].js",
          format: "cjs",
        },
      },
    } as any,
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ["electron"],
        input: {
          index: resolve(__dirname, "src/preload/index.ts"),
        },
        output: {
          entryFileNames: "[name].js",
          format: "cjs",
        },
      },
    } as any,
  },
  renderer: {
    resolve: {
      alias: {
        "@": resolve(__dirname, "src/renderer/src"),
      },
    },
    plugins: [tailwindcss(), react()],
  },
});
