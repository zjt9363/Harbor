export {}

declare global {
  interface Window {
    skillops: {
      selectWorkspace: () => Promise<string | null>
    }
  }
}
