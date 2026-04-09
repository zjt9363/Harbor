import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const desktopDir = path.resolve(__dirname, '..')
const repoRoot = path.resolve(desktopDir, '../..')
const templatePath = path.join(repoRoot, 'node_modules', 'app-builder-lib', 'templates', 'nsis', 'assistedInstaller.nsh')
const customTemplatePath = path.join(desktopDir, 'resources', 'assistedInstaller.nsh')
const backupDir = path.join(desktopDir, '.tmp')
const backupPath = path.join(backupDir, 'assistedInstaller.original.nsh')

function runElectronBuilder() {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32'
    const child = isWindows
      ? spawn(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `${path.join(repoRoot, 'node_modules', '.bin', 'electron-builder.cmd')} --win nsis`], {
          cwd: desktopDir,
          stdio: 'inherit',
          shell: false,
        })
      : spawn(path.join(repoRoot, 'node_modules', '.bin', 'electron-builder'), ['--win', 'nsis'], {
          cwd: desktopDir,
          stdio: 'inherit',
          shell: false,
        })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`electron-builder exited with code ${code ?? 'unknown'}`))
    })
  })
}

if (!existsSync(templatePath)) {
  throw new Error(`NSIS template not found: ${templatePath}`)
}

if (!existsSync(customTemplatePath)) {
  throw new Error(`Custom assisted installer template not found: ${customTemplatePath}`)
}

mkdirSync(backupDir, { recursive: true })
copyFileSync(templatePath, backupPath)
copyFileSync(customTemplatePath, templatePath)

try {
  await runElectronBuilder()
} finally {
  if (existsSync(backupPath)) {
    copyFileSync(backupPath, templatePath)
    rmSync(backupPath, { force: true })
  }
}
