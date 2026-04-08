export {}

declare global {
  interface Window {
    harbor: {
      selectWorkspace: () => Promise<string | null>
      getBackendStatus: () => Promise<{
        ok: boolean
        baseUrl: string
        service: string | null
        error?: string
      }>
      sendMessage: (payload: { threadId: string; message: string; workspacePath: string }) => Promise<{
        threadId: string
        reply: string
        title: string | null
      }>
    }
  }
}
