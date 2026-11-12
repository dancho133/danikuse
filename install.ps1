# Danikuse installer (Windows, certified path). Idempotent; downloads no browser.
$ErrorActionPreference = "Stop"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js >= 18 required: https://nodejs.org" }
if ([int](node -p "process.versions.node.split('.')[0]") -lt 18) { throw "Node.js >= 18 required (found $(node --version)): https://nodejs.org" }
if (-not (Get-Command agent-browser -ErrorAction SilentlyContinue)) { npm install -g agent-browser }
if (-not (Get-Command agent-desktop -ErrorAction SilentlyContinue)) { npm install -g agent-desktop }
npm install -g $PSScriptRoot
$brave = @(
  "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe",
  "C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe",
  "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\Application\brave.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $brave) { throw "Brave not found. Install Brave: https://brave.com/download" }
$skillsRoot = "$env:USERPROFILE\.dsh\skills"
if (Test-Path $skillsRoot) {
  foreach ($s in "danikuse", "danikuse-my", "danikuse-agent", "danikuse-desktop") {
    $src = if ($s -eq "danikuse") { "$PSScriptRoot\SKILL.md" } else { "$PSScriptRoot\skills\$s\SKILL.md" }
    New-Item -ItemType Directory -Force "$skillsRoot\$s" | Out-Null
    Copy-Item $src "$skillsRoot\$s\SKILL.md" -Force
  }
  Write-Host "Skills installed: /danikuse-my, /danikuse-agent, /danikuse-desktop (index: /danikuse)"
}
& "$PSScriptRoot\host\install-bridge.ps1"
$danikuseHome = if ($env:DANIKUSE_HOME) { $env:DANIKUSE_HOME } else { "$env:USERPROFILE\.danikuse" }
New-Item -ItemType Directory -Force "$danikuseHome\automation-profile", "$danikuseHome\automation-profile-bg" | Out-Null
node "$PSScriptRoot\bin\danikuse.mjs" doctor
Write-Host "Danikuse installed: 'danikuse' is on PATH. Automation profile: $danikuseHome\automation-profile (Brave engine, no browser download)."
