import type { Options } from "@wdio/types";
import path from "path";

export const config: WebdriverIO.Config = {
  runner: "local",
  specs: ["./tests/specs/**/*.e2e.ts"],
  maxInstances: 1,
  capabilities: [
    {
      browserName: "electron",
      "wdio:electronServiceOptions": {
        appBinaryPath: undefined,
        appArgs: [path.join(__dirname, "out/main/index.js")],
      },
    },
  ],
  logLevel: "warn",
  bail: 0,
  waitforTimeout: 60000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  services: ["electron"],
  framework: "mocha",
  reporters: ["spec"],
  mochaOpts: {
    ui: "bdd",
    timeout: 30 * 60 * 1000, // 30 minutes for large batch video processing benchmark
  },
};
