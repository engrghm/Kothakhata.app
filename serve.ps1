# কথাখাতা local server — run:  pwsh -File serve.ps1   then open http://localhost:5173
param([int]$Port = 5173)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$types = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.svg'='image/svg+xml'; '.json'='application/json'; '.webmanifest'='application/manifest+json'; '.png'='image/png'; '.ico'='image/x-icon' }
$l = [System.Net.HttpListener]::new()
$l.Prefixes.Add("http://localhost:$Port/")
$l.Start()
Write-Host "KothaKhata running at http://localhost:$Port  (Ctrl+C to stop)"
try {
  while ($l.IsListening) {
    $ctx = $l.GetContext()
    $res = $ctx.Response
    try {
      $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
      if ($path -eq '') { $path = 'index.html' }
      $file = [IO.Path]::GetFullPath((Join-Path $root $path))
      if ($file.StartsWith($root) -and (Test-Path -LiteralPath $file -PathType Leaf)) {
        [byte[]]$bytes = [IO.File]::ReadAllBytes($file)
        $ext = [IO.Path]::GetExtension($file).ToLower()
        $res.ContentType = $(if ($types[$ext]) { $types[$ext] } else { 'application/octet-stream' })
        $res.AddHeader('Cache-Control', 'no-cache')
        $res.SendChunked = $false
        $res.ContentLength64 = [long]$bytes.Length
        if ($ctx.Request.HttpMethod -ne 'HEAD') { $res.OutputStream.Write($bytes, 0, $bytes.Length) }
      } else { $res.StatusCode = 404 }
    } catch { Write-Host "error: $_" }
    finally { try { $res.Close() } catch {} }
  }
} finally { $l.Stop() }
