import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadDesktopConfig, saveDesktopConfig, type HarborDesktopConfig } from './config.js'
import { getLogDirectory, writeMainLog, writeRendererLog } from './logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const isDev = !app.isPackaged
const appId = 'com.harbor.desktop'
const windowIcon = process.platform === 'win32'
  ? join(__dirname, '../resources/icon.ico')
  : join(__dirname, '../resources/icon.png')

writeMainLog('INFO', 'bootstrap', 'main module loaded', {
  isDev,
  cwd: process.cwd(),
  execPath: process.execPath,
  logDir: getLogDirectory(),
})

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
  modelName?: string
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high'
  thinkingEnabled?: boolean
}

type ChatResponse = {
  threadId: string
  reply: string
  title: string | null
}

type DeerFlowModel = {
  name: string
  model: string
  displayName: string | null
  description: string | null
  supportsThinking: boolean
  supportsReasoningEffort: boolean
}

type ModelsListResponse = {
  models: DeerFlowModel[]
}

function buildDeerFlowUrl(path: string) {
  const { config } = loadDesktopConfig()
  return new URL(path, `${config.backendBaseUrl.replace(/\/$/, '')}/`).toString()
}

async function fetchJson(path: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const requestUrl = buildDeerFlowUrl(path)
  writeMainLog('INFO', 'http', 'request started', {
    path,
    url: requestUrl,
    method: init.method ?? 'GET',
    timeoutMs,
  })

  try {
    const response = await fetch(requestUrl, {
      ...init,
      signal: controller.signal,
    })
    const text = await response.text()
    const contentType = response.headers.get('content-type') ?? ''
    const isJson = contentType.toLowerCase().includes('application/json')
    let payload: unknown = null

    if (text) {
      if (isJson) {
        payload = JSON.parse(text)
      } else if (response.ok) {
        writeMainLog('ERROR', 'http', 'response was not json', {
          path,
          contentType,
          preview: text.slice(0, 200),
        })
        throw new Error(`DeerFlow 返回了非 JSON 响应：${contentType || 'unknown content-type'}`)
      } else {
        let detail = `HTTP ${response.status}`
        const trimmed = text.trim()

        if (trimmed) {
          if (trimmed.startsWith('<')) {
            detail = `HTTP ${response.status}（DeerFlow 返回了 HTML 页面，可能请求到了前端路由）`
          } else {
            detail = trimmed.slice(0, 200)
          }
        }

        writeMainLog('ERROR', 'http', 'request returned non-json error response', {
          path,
          status: response.status,
          contentType,
          preview: trimmed.slice(0, 200),
        })
        throw new Error(detail)
      }
    }

    writeMainLog('INFO', 'http', 'request completed', {
      path,
      status: response.status,
      ok: response.ok,
    })

    if (!response.ok) {
      const detail = typeof payload === 'object' && payload && 'detail' in payload ? String(payload.detail) : `HTTP ${response.status}`
      writeMainLog('ERROR', 'http', 'request returned error response', { path, detail })
      throw new Error(detail)
    }

    return payload
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      writeMainLog('ERROR', 'http', 'request timed out', { path, timeoutMs })
      throw new Error('请求 DeerFlow 超时。')
    }
    writeMainLog('ERROR', 'http', 'request failed', {
      path,
      error: error instanceof Error ? error.message : String(error),
    })
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
  writeMainLog('INFO', 'window', 'creating browser window', {
    width: 1440,
    height: 960,
    preload: join(__dirname, 'preload.js'),
  })

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
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    writeMainLog('INFO', 'window', 'loading dev url', { url: 'http://127.0.0.1:5173' })
    window.loadURL('http://127.0.0.1:5173')
  } else {
    writeMainLog('INFO', 'window', 'loading packaged index.html', { path: join(__dirname, '../dist/index.html') })
    window.loadFile(join(__dirname, '../dist/index.html'))
  }

  window.webContents.on('did-finish-load', () => {
    writeMainLog('INFO', 'window', 'renderer finished load')
  })

  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    writeMainLog('ERROR', 'window', 'renderer failed to load', {
      errorCode,
      errorDescription,
      validatedURL,
    })
  })

  window.webContents.on('render-process-gone', (_event, details) => {
    writeMainLog('ERROR', 'window', 'renderer process gone', {
      reason: details.reason,
      exitCode: details.exitCode,
    })
  })

  window.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    writeRendererLog(level >= 2 ? 'ERROR' : 'INFO', 'console', message, { line, sourceId })
  })

  window.on('unresponsive', () => {
    writeMainLog('WARN', 'window', 'window became unresponsive')
  })

  window.on('responsive', () => {
    writeMainLog('INFO', 'window', 'window responsive again')
  })
}

ipcMain.handle('workspace:select', async () => {
  writeMainLog('INFO', 'workspace', 'opening workspace selector')
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  })

  if (result.canceled || result.filePaths.length === 0) {
    writeMainLog('INFO', 'workspace', 'workspace selection cancelled')
    return null
  }

  writeMainLog('INFO', 'workspace', 'workspace selected', { path: result.filePaths[0] })
  return result.filePaths[0]
})

ipcMain.handle('backend:status', async (): Promise<DeerFlowStatus> => {
  const { config } = loadDesktopConfig()

  try {
    const payload = await fetchJson('/health', { method: 'GET' }, 5_000)
    const service = payload && typeof payload === 'object' && 'service' in payload ? String(payload.service) : null

    return {
      ok: true,
      baseUrl: config.backendBaseUrl,
      service,
    }
  } catch (error) {
    return {
      ok: false,
      baseUrl: config.backendBaseUrl,
      service: null,
      error: error instanceof Error ? error.message : '无法连接 DeerFlow。',
    }
  }
})

ipcMain.handle('models:list', async (): Promise<ModelsListResponse> => {
  const payload = await fetchJson('/api/models', { method: 'GET' }, 10_000)

  if (!payload || typeof payload !== 'object' || !('models' in payload) || !Array.isArray(payload.models)) {
    throw new Error('DeerFlow models response is invalid.')
  }

  const models = payload.models
    .map((item) => {
      if (!item || typeof item !== 'object' || typeof item.name !== 'string') {
        return null
      }

      const name = item.name.trim()
      if (!name) {
        return null
      }

      return {
        name,
        model: typeof item.model === 'string' && item.model.trim() ? item.model : name,
        displayName: typeof item.display_name === 'string' ? item.display_name : null,
        description: typeof item.description === 'string' ? item.description : null,
        supportsThinking: Boolean(item.supports_thinking),
        supportsReasoningEffort: Boolean(item.supports_reasoning_effort),
      } satisfies DeerFlowModel
    })
    .filter((item): item is DeerFlowModel => item !== null)

  return { models }
})

ipcMain.handle('chat:send', async (_event, request: ChatRequest): Promise<ChatResponse> => {
  writeMainLog('INFO', 'chat', 'sending message to deerflow', {
    threadId: request.threadId,
    workspacePath: request.workspacePath,
    messageLength: request.message.length,
  })

  const configurable: Record<string, unknown> = {
    thread_id: request.threadId,
  }

  if (request.modelName?.trim()) {
    configurable.model_name = request.modelName.trim()
  }
  if (request.reasoningEffort) {
    configurable.reasoning_effort = request.reasoningEffort
  }
  if (typeof request.thinkingEnabled === 'boolean') {
    configurable.thinking_enabled = request.thinkingEnabled
  }

  const payload = await fetchJson(
    `/api/threads/${encodeURIComponent(request.threadId)}/runs/wait`,
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
          configurable,
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

  writeMainLog('INFO', 'chat', 'received deerflow reply', {
    threadId: request.threadId,
    replyLength: reply.length,
    hasTitle: Boolean(title),
  })

  return {
    threadId: request.threadId,
    reply,
    title,
  }
})

ipcMain.handle('config:get', async () => {
  return loadDesktopConfig()
})

ipcMain.handle('config:update', async (_event, nextConfig: Partial<HarborDesktopConfig>) => {
  return saveDesktopConfig(nextConfig)
})

ipcMain.handle('config:open-file', async () => {
  const { path } = loadDesktopConfig()
  writeMainLog('INFO', 'config', 'opening config file in shell', { path })
  return shell.openPath(path)
})

ipcMain.on('log:write', (_event, payload: { level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'; scope: string; message: string; meta?: Record<string, unknown> }) => {
  writeRendererLog(payload.level, payload.scope, payload.message, payload.meta)
})

process.on('uncaughtException', (error) => {
  writeMainLog('ERROR', 'process', 'uncaught exception', {
    message: error.message,
    stack: error.stack,
  })
})

process.on('unhandledRejection', (reason) => {
  writeMainLog('ERROR', 'process', 'unhandled rejection', {
    reason: reason instanceof Error ? { message: reason.message, stack: reason.stack } : String(reason),
  })
})

app.whenReady().then(() => {
  writeMainLog('INFO', 'lifecycle', 'app ready')
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
  writeMainLog('INFO', 'lifecycle', 'all windows closed')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  writeMainLog('INFO', 'lifecycle', 'before quit')
})
