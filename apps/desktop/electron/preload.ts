import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('harbor', {
  selectWorkspace: () => ipcRenderer.invoke('workspace:select') as Promise<string | null>,
})
