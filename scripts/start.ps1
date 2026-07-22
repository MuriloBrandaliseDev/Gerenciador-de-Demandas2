$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$env:PORT = if ($env:PORT) { $env:PORT } else { "3030" }
node server/index.js
