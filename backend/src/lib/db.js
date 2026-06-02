import { initLocalStore } from "./localStore.js";

export const connectDB = async () => {
  await initLocalStore();
  console.log("Local JSON store is ready");
};
