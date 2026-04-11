const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('harbor', {
  writeLog: (level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', scope: string, message: string, meta?: Record<string, unknown>) =>
    ipcRenderer.send('log:write', { level, scope, message, meta }),
  selectWorkspace: () => ipcRenderer.invoke('workspace:select'),
  getConfig: () => ipcRenderer.invoke('config:get'),
  updateConfig: (config: { backendBaseUrl: string }) => ipcRenderer.invoke('config:update', config),
  openConfigFile: () => ipcRenderer.invoke('config:open-file'),
  getBackendStatus: () => ipcRenderer.invoke('backend:status'),
  listModels: () => ipcRenderer.invoke('models:list'),
  sendMessage: (payload: {
    threadId: string
    message: string
    workspacePath: string
    modelName?: string
    reasoningEffort?: 'none' | 'low' | 'medium' | 'high'
    thinkingEnabled?: boolean
  }) =>
    ipcRenderer.invoke('chat:send', payload),
})
