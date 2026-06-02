const fs = require("fs/promises");
const path = require("path");

const releaseDir = path.resolve(__dirname, "..", "release-final");

fs.rm(releaseDir, { recursive: true, force: true })
  .then(() => {
    console.log(`Cleaned ${releaseDir}`);
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
