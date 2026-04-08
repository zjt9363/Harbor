export {}

declare global {
  interface Window {
    harbor: {
      selectWorkspace: () => Promise<string | null>
    }
  }
}
