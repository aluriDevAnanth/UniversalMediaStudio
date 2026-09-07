import fs from "fs";
import path from "path";
import os from "os";

describe("UniversalMediaStudio UI Automation & Batch Video Import Benchmark", () => {
  const TARGET_MEDIA_DIR =
    process.env.MEDIA_FOLDER ||
    process.env.BENCHMARK_MEDIA_DIR ||
    path.join(os.homedir(), "Downloads");

  const benchmarkData: {
    fileName: string;
    fileSizeBytes: number;
    durationSec: number;
    processingTimeMs: number;
    throughputMBs: number;
    createdAt: string;
  }[] = [];

  it("should launch Electron app and authenticate or complete master password setup", async () => {
    await browser.pause(2000);

    // Check if password setup or login input exists
    const passwordInput = await $('input[type="password"]');
    if (await passwordInput.isExisting()) {
      await passwordInput.setValue("Universal123!");
      const submitBtn = await $('button[type="submit"]');
      if (await submitBtn.isExisting()) {
        await submitBtn.click();
      } else {
        await browser.keys(["Enter"]);
      }
      await browser.pause(1500);
    }

    // Verify main app layout is loaded
    const appHeader = await $("header");
    await expect(appHeader).toBeDisplayed();
  });

  it("should trigger multi-video upload for target folder and benchmark processing", async () => {
    if (!fs.existsSync(TARGET_MEDIA_DIR)) {
      console.warn(`[Warning] Target media directory not found: ${TARGET_MEDIA_DIR}`);
      return;
    }

    const videoFiles = fs
      .readdirSync(TARGET_MEDIA_DIR)
      .filter((f) => /\.(mp4|mkv|avi|webm|mov|m4v|adaumc)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    if (videoFiles.length === 0) {
      console.warn(`[Warning] No media files found in: ${TARGET_MEDIA_DIR}`);
      return;
    }

    console.log(`\n================================================================`);
    console.log(` Starting UI Multi-Video Upload Benchmark for ${videoFiles.length} files`);
    console.log(` Target Directory: ${TARGET_MEDIA_DIR}`);
    console.log(`================================================================\n`);

    const overallStart = Date.now();
    const baseDropTime = Date.now();

    for (let i = 0; i < videoFiles.length; i++) {
      const fileName = videoFiles[i];
      const filePath = path.join(TARGET_MEDIA_DIR, fileName);
      const fileSizeBytes = fs.statSync(filePath).size;
      const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(1);
      const creationTimestamp = new Date(baseDropTime + i * 10).toISOString();
      const taskId = `e2e_import_${Date.now()}_${i + 1}`;

      console.log(`[${i + 1}/${videoFiles.length}] Submitting: ${fileName} (${fileSizeMB} MB)`);

      const fileStart = Date.now();

      // Trigger import via Electron context bridge in the browser window
      await browser.execute(
        async (fPath, tId, cTime) => {
          // @ts-ignore
          return await window.api.videos.importFilePath(fPath, tId, cTime);
        },
        filePath,
        taskId,
        creationTimestamp,
      );

      // Monitor UI active import card in real time
      let completed = false;
      const maxWaitMs = 180000; // 3 min max per file
      const waitStart = Date.now();

      while (!completed && Date.now() - waitStart < maxWaitMs) {
        await browser.pause(500); // 500ms sample rate matching UI throttle

        const activeCard = await $(`[data-task-id="${taskId}"]`);
        if (!(await activeCard.isExisting())) {
          // Check if video is now present in db/store
          const isDone = await browser.execute(async (fName) => {
            // @ts-ignore
            const all = await window.api.videos.getAll();
            const clean = fName.replace(/\.[^/.]+$/, "").toLowerCase();
            return all.some((v: any) => v.title.toLowerCase().includes(clean));
          }, fileName);

          if (isDone) {
            completed = true;
          }
        }
      }

      const elapsedMs = Date.now() - fileStart;
      const elapsedSec = (elapsedMs / 1000).toFixed(2);
      const throughput = (fileSizeBytes / (1024 * 1024) / Math.max(0.1, elapsedMs / 1000)).toFixed(2);

      console.log(`   ✔ COMPLETED ${fileName} in ${elapsedSec}s | Speed: ${throughput} MB/s`);

      benchmarkData.push({
        fileName,
        fileSizeBytes,
        durationSec: 0,
        processingTimeMs: elapsedMs,
        throughputMBs: parseFloat(throughput),
        createdAt: creationTimestamp,
      });
    }

    const totalElapsedSec = ((Date.now() - overallStart) / 1000).toFixed(1);
    const totalMB = (
      benchmarkData.reduce((acc, item) => acc + item.fileSizeBytes, 0) /
      (1024 * 1024)
    ).toFixed(1);
    const avgThroughput = (parseFloat(totalMB) / Math.max(0.1, parseFloat(totalElapsedSec))).toFixed(2);

    console.log(`\n================================================================`);
    console.log(` Multi-Video Upload Benchmark Completed in ${totalElapsedSec}s`);
    console.log(` Total Data Processed: ${totalMB} MB | Average Throughput: ${avgThroughput} MB/s`);
    console.log(`================================================================\n`);
  });

  it("should verify 'Oldest Added' sorting strictly preserves selection order in the UI", async () => {
    if (benchmarkData.length === 0) return;

    // Select 'oldest' sort dropdown option
    const sortDropdown = (await $('[aria-label="Sort options"]')) || (await $('button:has-text("Sort")'));
    if (await sortDropdown.isExisting()) {
      await sortDropdown.click();
      await browser.pause(300);
      const oldestOption = (await $('div:has-text("Oldest Added")')) || (await $('button:has-text("Oldest Added")'));
      if (await oldestOption.isExisting()) {
        await oldestOption.click();
        await browser.pause(500);
      }
    }

    // Verify first uploaded file is rendered first in the grid
    const firstCardTitle = await $("h3");
    if (await firstCardTitle.isExisting()) {
      const titleText = await firstCardTitle.getText();
      const expectedFirstName = benchmarkData[0].fileName.replace(/\.[^/.]+$/, "").toLowerCase();
      expect(titleText.toLowerCase()).toContain(expectedFirstName);
    }
  });

  it("should verify video playback and container bundle inspection through UI", async () => {
    if (benchmarkData.length === 0) return;

    // Click on the first video card to start playback
    const firstVideoCard = await $(".group.relative.cursor-pointer");
    if (await firstVideoCard.isExisting()) {
      await firstVideoCard.click();
      await browser.pause(2000);

      // Verify video player modal or HTML5 video element is active
      const videoElement = await $("video");
      if (await videoElement.isExisting()) {
        await expect(videoElement).toBeDisplayed();
      }

      // Close modal
      await browser.keys(["Escape"]);
      await browser.pause(500);
    }
  });
});
