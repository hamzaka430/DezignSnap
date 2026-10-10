$dest = "dezignsnap-v2.1.1.zip"
if (Test-Path $dest) { Remove-Item $dest -Force }
$targets = @(
  "manifest.json",
  "background.js",
  "content.js",
  "content.css",
  "popup.html",
  "popup.js",
  "styles.css",
  "options.html",
  "options.js",
  "options.css",
  "session.html",
  "session.js",
  "welcome.html",
  "privacy-policy.html",
  "icons",
  "assests",
  "lib"
)
Compress-Archive -Path $targets -DestinationPath $dest -Force
Write-Host "Success: Created $dest"
Get-Item $dest | Select-Object Name, Length
