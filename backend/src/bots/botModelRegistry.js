import { getBotEnvConfig } from "./botConfig.js";

export function getRegisteredBotModels() {
  const config = getBotEnvConfig();
  return [
    {
      key: "text",
      model: config.models.text,
      provider: "huggingface-local",
      enabled: Boolean(config.models.text),
      localFilesOnly: config.models.localFilesOnly,
    },
    {
      key: "multilingualText",
      model: config.models.multilingualText,
      provider: "huggingface-local",
      enabled: Boolean(config.models.multilingualText),
      localFilesOnly: config.models.localFilesOnly,
    },
    {
      key: "image",
      model: config.models.image,
      provider: "huggingface-local",
      enabled: Boolean(config.models.image),
      localFilesOnly: config.models.localFilesOnly,
    },
  ];
}
