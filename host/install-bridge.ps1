# Registers the Danikuse Bridge native messaging host for Brave and Chrome.
# The extension itself is loaded once by hand: brave://extensions ->
# Developer mode -> Load unpacked -> select this repo's extension folder.
$ErrorActionPreference = "Stop"
$hostDir = $PSScriptRoot
$manifestPath = Join-Path $hostDir "com.danikuse.bridge.json"
$manifest = @{
  name = "com.danikuse.bridge"
  description = "Danikuse Bridge native host"
  path = (Join-Path $hostDir "danikuse-host.cmd")
  type = "stdio"
  allowed_origins = @("chrome-extension://cleibgpfiidenlabnkkaiennbehnhlaj/")
} | ConvertTo-Json
Set-Content $manifestPath $manifest -Encoding utf8
foreach ($root in @(
  "HKCU:\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts",
  "HKCU:\Software\Google\Chrome\NativeMessagingHosts",
  "HKCU:\Software\Chromium\NativeMessagingHosts"
)) {
  New-Item -Path "$root\com.danikuse.bridge" -Force | Out-Null
  Set-ItemProperty -Path "$root\com.danikuse.bridge" -Name "(Default)" -Value $manifestPath
  Write-Host "registered: $root\com.danikuse.bridge"
}
Write-Host "Native host registered. Now load the extension once: brave://extensions -> Developer mode -> Load unpacked -> $hostDir\..\extension"
