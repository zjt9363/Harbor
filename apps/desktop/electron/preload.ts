import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('harbor', {
  selectWorkspace: () => ipcRenderer.invoke('workspace:select') as Promise<string | null>,
  getBackendStatus: () =>
    ipcRenderer.invoke('backend:status') as Promise<{
      ok: boolean
      baseUrl: string
      service: string | null
      error?: string
    }>,
  sendMessage: (payload: { threadId: string; message: string; workspacePath: string }) =>
    ipcRenderer.invoke('chat:send', payload) as Promise<{
      threadId: string
      reply: string
      title: string | null
    }>,
})
