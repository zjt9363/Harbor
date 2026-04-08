import { app } from 'electron'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { writeMainLog } from './logger.js'

export type HarborDesktopConfig = {
  backendBaseUrl: string
}

export type HarborDesktopConfigSnapshot = {
  config: HarborDesktopConfig
  path: string
}

const defaultConfig: HarborDesktopConfig = {
  backendBaseUrl: process.env.HARBOR_DEERFLOW_BASE_URL ?? 'http://127.0.0.1:2026',
}

function getConfigPath() {
  return join(app.getPath('userData'), 'harbor.config.json')
}

function ensureConfigDir(path: string) {
  mkdirSync(dirname(path), { recursive: true })
}

function normalizeConfig(input: Partial<HarborDesktopConfig> | null | undefined): HarborDesktopConfig {
  const backendBaseUrl = typeof input?.backendBaseUrl === 'string' && input.backendBaseUrl.trim()
    ? input.backendBaseUrl.trim().replace(/\/+$/, '')
    : defaultConfig.backendBaseUrl

  return {
    backendBaseUrl,
  }
}

export function loadDesktopConfig(): HarborDesktopConfigSnapshot {
  const path = getConfigPath()
  ensureConfigDir(path)

  try {
    const raw = readFileSync(path, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<HarborDesktopConfig>
    const config = normalizeConfig(parsed)
    writeMainLog('DEBUG', 'config', 'loaded desktop config', { path, backendBaseUrl: config.backendBaseUrl })

    return { config, path }
  } catch {
    const config = normalizeConfig(defaultConfig)
    writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, 'utf-8')
    writeMainLog('WARN', 'config', 'config missing or invalid, recreated default config', { path, backendBaseUrl: config.backendBaseUrl })
    return { config, path }
  }
}

export function saveDesktopConfig(nextConfig: Partial<HarborDesktopConfig>): HarborDesktopConfigSnapshot {
  const current = loadDesktopConfig()
  const merged = normalizeConfig({
    ...current.config,
    ...nextConfig,
  })

  writeFileSync(current.path, `${JSON.stringify(merged, null, 2)}\n`, 'utf-8')
  writeMainLog('INFO', 'config', 'saved desktop config', { path: current.path, backendBaseUrl: merged.backendBaseUrl })

  return {
    config: merged,
    path: current.path,
  }
}
