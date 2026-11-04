param(
    [ValidateSet('install','compile','test','node','deploy:local','deploy:sepolia','demo','dev','build','keeper:local','keeper:sepolia')]
    [string]$Tarea = 'test'
)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) { $proyectoNode = $nodeCommand.Source }
else {
    $proyectoNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    if (-not (Test-Path -LiteralPath $proyectoNode)) { throw 'Instala Node.js 22 o 24 LTS.' }
}
if ($Tarea -eq 'install') {
    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($npmCommand) { & $npmCommand.Source install }
    else {
        $proyectoPnpm = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\pnpm\bin\pnpm.cjs'
        if (-not (Test-Path -LiteralPath $proyectoPnpm)) { throw 'Instala Node.js con npm.' }
        & $proyectoNode $proyectoPnpm install --store-dir .pnpm-store --node-linker=hoisted
        # Las dependencias usadas tienen binarios precompilados para Windows.
    }
} elseif ($Tarea -eq 'dev') {
    & $proyectoNode node_modules/vite/bin/vite.js frontend --host 127.0.0.1
} elseif ($Tarea -eq 'build') {
    & $proyectoNode node_modules/vite/bin/vite.js build frontend
} elseif ($Tarea -in @('compile','test','node')) {
    & $proyectoNode scripts/hardhat.js $Tarea
} elseif ($Tarea -eq 'demo') {
    & $proyectoNode scripts/hardhat.js run scripts/demo.js
} else {
    $proyectoPartes = $Tarea.Split(':')
    $proyectoScript = if ($proyectoPartes[0] -eq 'deploy') { 'scripts/deploy.js' } else { 'scripts/keeper.js' }
    $proyectoRed = if ($proyectoPartes[1] -eq 'local') { 'localhost' } else { 'sepolia' }
    & $proyectoNode scripts/hardhat.js run $proyectoScript --network $proyectoRed
}
exit $LASTEXITCODE
