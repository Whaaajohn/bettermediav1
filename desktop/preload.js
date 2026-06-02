const { contextBridge, ipcRenderer } = require("electron");

const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload);

const api = {
  getInitialState: () => invoke("app:get-initial-state"),
  settings: {
    get: () => invoke("settings:get"),
    save: (settings) => invoke("settings:save", settings),
    reset: () => invoke("settings:reset"),
    validate: (settings) => invoke("settings:validate", settings),
    reveal: (key) => invoke("settings:reveal", { key }),
    generateSecret: (key) => invoke("settings:generate-secret", { key })
  },
  server: {
    start: () => invoke("server:start"),
    stop: () => invoke("server:stop"),
    restart: () => invoke("server:restart"),
    status: () => invoke("server:status")
  },
  app: {
    openMain: () => invoke("app:open-main"),
    openAdmin: () => invoke("app:open-admin"),
    openFolder: (folder) => invoke("app:open-folder", { folder })
  },
  logs: {
    get: () => invoke("logs:get"),
    clear: () => invoke("logs:clear"),
    export: () => invoke("logs:export")
  },
  diagnostics: {
    get: () => invoke("diagnostics:get"),
    health: () => invoke("diagnostics:health")
  },
  events: {
    onServerStatus(callback) {
      const listener = (_event, status) => callback(status);
      ipcRenderer.on("server:status", listener);
      return () => ipcRenderer.removeListener("server:status", listener);
    },
    onLogEntry(callback) {
      const listener = (_event, entry) => callback(entry);
      ipcRenderer.on("logs:entry", listener);
      return () => ipcRenderer.removeListener("logs:entry", listener);
    }
  }
};

contextBridge.exposeInMainWorld("betterMedia", api);
