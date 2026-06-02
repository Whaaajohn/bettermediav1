const { spawn } = require("child_process");
const path = require("path");

const releaseDir = path.resolve(__dirname, "..", "release-final");

const child = spawn("explorer.exe", [releaseDir], {
  windowsHide: false,
  stdio: "ignore",
  detached: true
});

child.unref();
