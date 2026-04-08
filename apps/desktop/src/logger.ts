type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'

export function logRenderer(level: LogLevel, scope: string, message: string, meta?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.harbor && typeof window.harbor.writeLog === 'function') {
    window.harbor.writeLog(level, scope, message, meta)
    return
  }

  const line = `[renderer] [${level}] [${scope}] ${message}`
  if (level === 'ERROR') {
    console.error(line, meta)
    return
  }

  if (level === 'WARN') {
    console.warn(line, meta)
    return
  }

  console.log(line, meta)
}
