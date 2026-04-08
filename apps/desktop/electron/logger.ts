import { app } from 'electron'
import { appendFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
type LoggerMeta = Record<string, unknown> | undefined

function resolvePrimaryLogDir() {
  if (app.isPackaged) {
    return join(dirname(process.execPath), 'logs')
  }

  return join(process.cwd(), 'storage', 'logs', 'desktop')
}

function resolveFallbackLogDir() {
  try {
    return join(app.getPath('userData'), 'logs')
  } catch {
    return join(process.cwd(), 'storage', 'logs', 'desktop-fallback')
  }
}

function ensureDir(path: string) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true })
  }
}

function safeJson(meta: LoggerMeta) {
  if (!meta) {
    return ''
  }

  try {
    return ` ${JSON.stringify(meta)}`
  } catch {
    return ' {"meta":"[unserializable]"}'
  }
}

function writeLine(fileName: string, line: string) {
  const primaryDir = resolvePrimaryLogDir()

  try {
    ensureDir(primaryDir)
    appendFileSync(join(primaryDir, fileName), line, 'utf-8')
    return
  } catch {
    const fallbackDir = resolveFallbackLogDir()
    ensureDir(fallbackDir)
    appendFileSync(join(fallbackDir, fileName), line, 'utf-8')
  }
}

export function getLogDirectory() {
  return resolvePrimaryLogDir()
}

export function writeMainLog(level: LogLevel, scope: string, message: string, meta?: LoggerMeta) {
  const line = `${new Date().toISOString()} [main] [${level}] [${scope}] ${message}${safeJson(meta)}\n`
  writeLine('main.log', line)

  if (level === 'ERROR') {
    console.error(line.trim())
    return
  }

  if (level === 'WARN') {
    console.warn(line.trim())
    return
  }

  console.log(line.trim())
}

export function writeRendererLog(level: LogLevel, scope: string, message: string, meta?: LoggerMeta) {
  const line = `${new Date().toISOString()} [renderer] [${level}] [${scope}] ${message}${safeJson(meta)}\n`
  writeLine('renderer.log', line)
}
