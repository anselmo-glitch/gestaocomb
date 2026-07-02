# Servidor estático simples para validação local (não requer Node nem Python).
# Uso: powershell -ExecutionPolicy Bypass -File serve.ps1 [-Port 5173]
param([int]$Port = 5173)

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Servindo $PSScriptRoot em http://localhost:$Port/ (Ctrl+C para parar)"

$root = (Resolve-Path $PSScriptRoot).Path
$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".mjs"  = "text/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".md"   = "text/plain; charset=utf-8"
  ".sql"  = "text/plain; charset=utf-8"
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  try {
    $path = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath)
    if ($path.EndsWith("/")) { $path = $path + "index.html" }
    $candidate = Join-Path $root ($path.TrimStart("/") -replace "/", "\")
    $file = $null
    if (Test-Path $candidate -PathType Leaf) {
      $file = (Resolve-Path $candidate).Path
      if (-not $file.StartsWith($root)) { $file = $null }
    }
    if ($file) {
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      if ($mime.ContainsKey($ext)) { $context.Response.ContentType = $mime[$ext] }
      $context.Response.ContentLength64 = $bytes.Length
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $context.Response.StatusCode = 404
      $body = [System.Text.Encoding]::UTF8.GetBytes("404 - arquivo nao encontrado")
      $context.Response.OutputStream.Write($body, 0, $body.Length)
    }
  } catch {
    try { $context.Response.StatusCode = 500 } catch {}
  } finally {
    try { $context.Response.OutputStream.Close() } catch {}
  }
}
