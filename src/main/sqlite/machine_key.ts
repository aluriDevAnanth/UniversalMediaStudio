import crypto from "crypto";

export function getDefaultMachineKey(): string {
  const os = require("os");
  let user = "default_user";
  try {
    user = os.userInfo().username || "default_user";
  } catch {}
  const machineData = `${os.hostname()}-${user}-${os.platform()}-${os.arch()}-UniversalMediaStudioVaultKey_v1`;
  return crypto.createHash("sha256").update(machineData).digest("hex");
}
