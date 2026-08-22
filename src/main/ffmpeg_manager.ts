import fs from "fs";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";

export class FFmpegManager {
  /**
   * Returns path to working ffmpeg executable from local node_modules
   */
  public static async getFFmpegPath(): Promise<string> {
    if (
      ffmpegInstaller &&
      ffmpegInstaller.path &&
      fs.existsSync(ffmpegInstaller.path)
    ) {
      return `"${ffmpegInstaller.path}"`;
    }
    return "ffmpeg";
  }

  /**
   * Returns path to working ffprobe executable from local node_modules
   */
  public static async getFFprobePath(): Promise<string> {
    if (
      ffprobeInstaller &&
      ffprobeInstaller.path &&
      fs.existsSync(ffprobeInstaller.path)
    ) {
      return `"${ffprobeInstaller.path}"`;
    }
    return "ffprobe";
  }
}
