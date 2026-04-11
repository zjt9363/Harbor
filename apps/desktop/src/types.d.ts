export {}

type HarborLogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'

declare global {
  interface Window {
    harbor: {
      writeLog: (level: HarborLogLevel, scope: string, message: string, meta?: Record<string, unknown>) => void
      selectWorkspace: () => Promise<string | null>
      getConfig: () => Promise<{
        config: {
          backendBaseUrl: string
        }
        path: string
      }>
      updateConfig: (config: { backendBaseUrl: string }) => Promise<{
        config: {
          backendBaseUrl: string
        }
        path: string
      }>
      openConfigFile: () => Promise<string>
      getBackendStatus: () => Promise<{
        ok: boolean
        baseUrl: string
        service: string | null
        error?: string
      }>
      listModels: () => Promise<{
        models: Array<{
          name: string
          model: string
          displayName: string | null
          description: string | null
          supportsThinking: boolean
          supportsReasoningEffort: boolean
        }>
      }>
      sendMessage: (payload: {
        threadId: string
        message: string
        workspacePath: string
        modelName?: string
        reasoningEffort?: 'none' | 'low' | 'medium' | 'high'
        thinkingEnabled?: boolean
      }) => Promise<{
        threadId: string
        reply: string
        title: string | null
      }>
    }
  }
}
