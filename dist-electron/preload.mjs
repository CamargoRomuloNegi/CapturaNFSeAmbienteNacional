let electron = require("electron");
//#region electron/preload.ts
electron.contextBridge.exposeInMainWorld("electronAPI", {
	ping: () => electron.ipcRenderer.invoke("ping"),
	setupSupabase: (url, key) => electron.ipcRenderer.invoke("setupSupabase", url, key),
	checkSupabaseConfig: () => electron.ipcRenderer.invoke("checkSupabaseConfig"),
	selectCertificate: () => electron.ipcRenderer.invoke("selectCertificate"),
	unlockCertificate: (filePath, password) => electron.ipcRenderer.invoke("unlockCertificate", filePath, password),
	getActiveCertificate: () => electron.ipcRenderer.invoke("getActiveCertificate"),
	startSync: (dataInicial, dataFinal) => electron.ipcRenderer.invoke("startSync", dataInicial, dataFinal),
	onSyncProgress: (callback) => {
		electron.ipcRenderer.on("syncProgress", (_event, value) => callback(value));
	}
});
//#endregion
