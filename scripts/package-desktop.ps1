$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
npm run dist:desktop:win
