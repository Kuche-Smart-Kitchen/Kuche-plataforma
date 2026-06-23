$ErrorActionPreference = "Stop"

Add-Type -AssemblyName PresentationCore

$dir = "c:\Users\Admin\kuche-plataforma\public\images\electrodomesticos"
if (-not (Test-Path $dir)) {
  Write-Error "No existe directorio: $dir"
}

$converted = 0
$failed = 0

Get-ChildItem -Path $dir -File | ForEach-Object {
  $file = $_
  $ext = $file.Extension.ToLowerInvariant()
  if ($ext -notin @(".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff")) {
    return
  }

  $src = $file.FullName
  $tmp = "$src.__normalized__"

  try {
    $in = [System.IO.File]::OpenRead($src)
    try {
      $decoder = [System.Windows.Media.Imaging.BitmapDecoder]::Create(
        $in,
        [System.Windows.Media.Imaging.BitmapCreateOptions]::PreservePixelFormat,
        [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad
      )
      $frame = $decoder.Frames[0]
    } finally {
      $in.Dispose()
    }

    if ($ext -eq ".png") {
      $encoder = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
    } else {
      $encoder = New-Object System.Windows.Media.Imaging.JpegBitmapEncoder
      $encoder.QualityLevel = 90
    }
    $encoder.Frames.Add($frame)

    $out = [System.IO.File]::Open($tmp, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
    try {
      $encoder.Save($out)
    } finally {
      $out.Dispose()
    }

    Move-Item -Force $tmp $src
    $converted++
    Write-Host "OK   $($file.Name)"
  } catch {
    $failed++
    if (Test-Path $tmp) { Remove-Item -Force $tmp }
    Write-Host "FAIL $($file.Name) -> $($_.Exception.Message)"
  }
}

Write-Host "------"
Write-Host "Convertidas: $converted"
Write-Host "Fallidas:    $failed"
