import { resetLocalStoreForFreshLaunch } from "../lib/localStore.js";

const result = await resetLocalStoreForFreshLaunch();

console.log(JSON.stringify({
  ...result,
  message: "Local database reset for a fresh launch. Previous db was backed up first.",
}, null, 2));
