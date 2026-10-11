# DezignSnap Extension Packager (Chrome Web Store compliant)
$rootDir = (Resolve-Path "$PSScriptRoot/..").Path
$extensionDir = Join-Path $rootDir "extension"
$distDir = Join-Path $rootDir "dist"

if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
}

$dest = Join-Path $distDir "dezignsnap-v2.1.1.zip"
if (Test-Path $dest) {
    Remove-Item $dest -Force
}

# Compress extension contents directly to zip root (required by CWS)
$itemsToZip = Get-ChildItem -Path $extensionDir | Select-Object -ExpandProperty FullName
Compress-Archive -Path $itemsToZip -DestinationPath $dest -Force

Write-Host "Success: Packaged extension to $dest" -ForegroundColor Green
Get-Item $dest | Select-Object Name, Length, LastWriteTime
