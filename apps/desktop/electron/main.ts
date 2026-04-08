import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const isDev = !app.isPackaged
const appId = 'com.harbor.desktop'
const deerFlowBaseUrl = process.env.HARBOR_DEERFLOW_BASE_URL ?? 'http://127.0.0.1:2026'
const windowIcon = process.platform === 'win32'
  ? join(__dirname, '../resources/icon.ico')
  : join(__dirname, '../resources/icon.png')

type DeerFlowStatus = {
  ok: boolean
  baseUrl: string
  service: string | null
  error?: string
}

type ChatRequest = {
  threadId: string
  message: string
  workspacePath: string
}

type ChatResponse = {
  threadId: string
  reply: string
  title: string | null
}

function buildDeerFlowUrl(path: string) {
  return new URL(path, `${deerFlowBaseUrl.replace(/\/$/, '')}/`).toString()
}

async function fetchJson(path: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(buildDeerFlowUrl(path), {
      ...init,
      signal: controller.signal,
    })
    const text = await response.text()
    const payload = text ? JSON.parse(text) : null

    if (!response.ok) {
      const detail = typeof payload === 'object' && payload && 'detail' in payload ? String(payload.detail) : `HTTP ${response.status}`
      throw new Error(detail)
    }

    return payload
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('请求 DeerFlow 超时。')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function normalizeContent(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => normalizeContent(item))
      .filter(Boolean)
      .join('\n')
  }

  if (content && typeof content === 'object') {
    if ('text' in content && typeof content.text === 'string') {
      return content.text
    }

    if ('content' in content) {
      return normalizeContent(content.content)
    }
  }

  return content == null ? '' : String(content)
}

function extractAssistantReply(payload: unknown) {
  if (!payload || typeof payload !== 'object' || !('messages' in payload) || !Array.isArray(payload.messages)) {
    return ''
  }

  for (let index = payload.messages.length - 1; index >= 0; index -= 1) {
    const message = payload.messages[index]
    if (!message || typeof message !== 'object' || message.type !== 'ai') {
      continue
    }

    const content = normalizeContent('content' in message ? message.content : '')
    if (content.trim()) {
      return content
    }
  }

  return ''
}

function buildUserMessage(message: string, workspacePath: string) {
  return [
    '[Harbor client context]',
    `Selected local workspace: ${workspacePath}`,
    'Note: this path comes from the Harbor desktop client. Unless files are uploaded or explicitly mounted, DeerFlow may not be able to directly access this local path.',
    '',
    '[User message]',
    message,
  ].join('\n')
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1200,
    minHeight: 760,
    icon: windowIcon,
    backgroundColor: '#101319',
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#111317',
      symbolColor: '#f3f5f9',
      height: 44,
    },
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    window.loadURL('http://127.0.0.1:5173')
  } else {
    window.loadFile(join(__dirname, '../dist/index.html'))
  }
}

ipcMain.handle('workspace:select', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  return result.filePaths[0]
})

ipcMain.handle('backend:status', async (): Promise<DeerFlowStatus> => {
  try {
    const payload = await fetchJson('/health', { method: 'GET' }, 5_000)
    const service = payload && typeof payload === 'object' && 'service' in payload ? String(payload.service) : null

    return {
      ok: true,
      baseUrl: deerFlowBaseUrl,
      service,
    }
  } catch (error) {
    return {
      ok: false,
      baseUrl: deerFlowBaseUrl,
      service: null,
      error: error instanceof Error ? error.message : '无法连接 DeerFlow。',
    }
  }
})

ipcMain.handle('chat:send', async (_event, request: ChatRequest): Promise<ChatResponse> => {
  const payload = await fetchJson(
    '/api/runs/wait',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          messages: [
            {
              role: 'user',
              content: buildUserMessage(request.message, request.workspacePath),
            },
          ],
        },
        metadata: {
          source: 'harbor-desktop',
          workspace_path: request.workspacePath,
        },
        config: {
          configurable: {
            thread_id: request.threadId,
          },
        },
      }),
    },
    180_000,
  )

  const reply = extractAssistantReply(payload)
  if (!reply.trim()) {
    throw new Error('DeerFlow 已返回结果，但 Harbor 没有解析到可显示的 AI 回复。')
  }

  const title = payload && typeof payload === 'object' && 'title' in payload && typeof payload.title === 'string'
    ? payload.title
    : null

  return {
    threadId: request.threadId,
    reply,
    title,
  }
})

app.whenReady().then(() => {
  app.setAppUserModelId(appId)
  Menu.setApplicationMenu(null)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
