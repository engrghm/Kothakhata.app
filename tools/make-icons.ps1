# Draws the কথাখাতা icon (same design as icons/icon.svg) to PNG files. Windows only.
Add-Type -AssemblyName System.Drawing
$out = Join-Path (Split-Path -Parent $PSScriptRoot) 'icons'

function Draw([int]$size, [double]$pad, [string]$file) {
  $bmp = [System.Drawing.Bitmap]::new($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $teal = [System.Drawing.ColorTranslator]::FromHtml('#0d6b5e')
  $sun = [System.Drawing.ColorTranslator]::FromHtml('#f5a524')
  $k = $size * (1 - 2 * $pad) / 512.0
  $o = $size * $pad
  function P([double]$v) { return [float]($o + $v * $k) }
  if ($pad -gt 0) { $g.Clear($teal) } else {
    $g.Clear([System.Drawing.Color]::Transparent)
    $r = 112 * $k; $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $path.AddArc((P 0), (P 0), 2*$r, 2*$r, 180, 90); $path.AddArc((P 512) - 2*$r, (P 0), 2*$r, 2*$r, 270, 90)
    $path.AddArc((P 512) - 2*$r, (P 512) - 2*$r, 2*$r, 2*$r, 0, 90); $path.AddArc((P 0), (P 512) - 2*$r, 2*$r, 2*$r, 90, 90); $path.CloseFigure()
    $g.FillPath([System.Drawing.SolidBrush]::new($teal), $path)
  }
  $g.FillEllipse([System.Drawing.SolidBrush]::new($sun), (P 164), (P 144), [float](184*$k), [float](184*$k))
  $pen = [System.Drawing.Pen]::new($sun, [float](22*$k)); $pen.StartCap = 'Round'; $pen.EndCap = 'Round'
  $g.DrawLine($pen, (P 256), (P 92), (P 256), (P 64))
  $g.DrawLine($pen, (P 148), (P 128), (P 128), (P 108))
  $g.DrawLine($pen, (P 364), (P 128), (P 384), (P 108))
  $g.DrawLine($pen, (P 112), (P 236), (P 84), (P 236))
  $g.DrawLine($pen, (P 400), (P 236), (P 428), (P 236))
  $book = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $book.AddBezier((P 96), (P 330), (P 152), (P 304), (P 204), (P 304), (P 256), (P 334))
  $book.AddBezier((P 256), (P 334), (P 308), (P 304), (P 360), (P 304), (P 416), (P 330))
  $book.AddLine((P 416), (P 330), (P 416), (P 414))
  $book.AddBezier((P 416), (P 414), (P 360), (P 388), (P 308), (P 388), (P 256), (P 418))
  $book.AddBezier((P 256), (P 418), (P 204), (P 388), (P 152), (P 388), (P 96), (P 414))
  $book.CloseFigure()
  $g.FillPath([System.Drawing.Brushes]::White, $book)
  $g.DrawLine([System.Drawing.Pen]::new($teal, [float](12*$k)), (P 256), (P 334), (P 256), (P 418))
  $bmp.Save((Join-Path $out $file), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
Draw 192 0 'icon-192.png'
Draw 512 0 'icon-512.png'
Draw 512 0.12 'maskable-512.png'
Draw 180 0.06 'apple-touch-icon.png'
Write-Host "icons written to $out"
