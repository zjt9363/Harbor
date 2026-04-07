import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('skillops', {
  selectWorkspace: () => ipcRenderer.invoke('workspace:select') as Promise<string | null>,
})
