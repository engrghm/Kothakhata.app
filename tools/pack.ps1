# Builds the upload folder and zip for hosting (only the files the live site needs).
$app = Split-Path -Parent $PSScriptRoot
$dist = Join-Path (Split-Path -Parent $app) 'kothakhata-dist'
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory $dist | Out-Null
$keep = @('index.html', 'privacy.html', 'manifest.webmanifest', 'sw.js', '_headers', 'css', 'js', 'icons')
foreach ($k in $keep) { Copy-Item (Join-Path $app $k) -Destination $dist -Recurse }
$zip = "$dist.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $dist '*') -DestinationPath $zip
$n = (Get-ChildItem $dist -Recurse -File).Count
Write-Host "Ready: $dist ($n files) and $zip"
