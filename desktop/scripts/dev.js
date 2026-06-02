const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const desktopRoot = path.resolve(__dirname, "..");
const rendererUrl = "http://127.0.0.1:5180";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function waitForRenderer(url, timeoutMs = 30000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });

      req.on("error", () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error("Renderer dev server did not start in time."));
          return;
        }
        setTimeout(check, 500);
      });

      req.setTimeout(1000, () => {
        req.destroy();
      });
    };

    check();
  });
}

async function main() {
  const renderer = spawn(npmCommand, ["run", "renderer:dev"], {
    cwd: desktopRoot,
    stdio: "inherit",
    shell: false
  });

  const stopRenderer = () => {
    if (!renderer.killed) renderer.kill();
  };

  process.on("SIGINT", stopRenderer);
  process.on("SIGTERM", stopRenderer);
  process.on("exit", stopRenderer);

  await waitForRenderer(rendererUrl);

  const electronPath = require("electron");
  const electron = spawn(electronPath, [desktopRoot], {
    cwd: desktopRoot,
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: rendererUrl
    }
  });

  electron.on("exit", (code) => {
    stopRenderer();
    process.exit(code || 0);
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
