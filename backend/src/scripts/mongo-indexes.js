import { closeDatabase, connectDatabase } from "../config/database.js";
import { env } from "../config/env.js";

if (env.DB_DRIVER !== "mongo" || !env.MONGO_URI) {
  console.error("Set DB_DRIVER=mongo and MONGO_URI before creating MongoDB indexes.");
  process.exit(1);
}

await connectDatabase();
const models = await import("../models/index.js");
const result = {};

for (const [name, model] of Object.entries(models)) {
  if (!model?.createIndexes) continue;
  await model.createIndexes();
  result[name] = await model.collection.indexes();
}

await closeDatabase();

console.log(JSON.stringify({ success: true, models: Object.keys(result), indexes: result }, null, 2));
