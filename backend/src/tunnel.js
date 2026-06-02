import { spawn } from "node:child_process";
import { platform } from "node:os";

const port = process.env.NGROK_PORT || process.env.PORT || "5174";
const domain = process.env.NGROK_DOMAIN?.trim();
const authtoken = process.env.NGROK_AUTHTOKEN?.trim();
const ngrokCommand = platform() === "win32" ? "ngrok.cmd" : "ngrok";

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0 || code === null) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function main() {
  if (authtoken) {
    await run(ngrokCommand, ["config", "add-authtoken", authtoken]);
  }

  const args = ["http", port, "--log=stdout"];
  if (domain) args.push("--domain", domain);

  console.log(`[LOCAL TUNNEL] Starting ngrok for http://127.0.0.1:${port}`);
  console.log("[LOCAL TUNNEL] Keep the backend running in another terminal.");
  await run(ngrokCommand, args);
}

main().catch((error) => {
  console.error("[LOCAL TUNNEL] Could not start ngrok:", error.message);
  console.error("[LOCAL TUNNEL] Install ngrok from https://ngrok.com/download or add ngrok.exe to PATH, then run npm run tunnel --prefix backend again.");
  process.exit(1);
});
