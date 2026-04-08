import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { rcedit } from 'rcedit'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') {
    return
  }

  const productFilename = context.packager.appInfo.productFilename
  const exePath = path.join(context.appOutDir, `${productFilename}.exe`)
  const iconPath = path.resolve(__dirname, '../resources/icon.ico')

  await rcedit(exePath, {
    icon: iconPath,
  })
}
