# PowerShell script to create desktop shortcut for PanPanocha POS (Silent mode)
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "PanPanocha POS.lnk"
$TargetPath = "C:\Dev\PanPanocha-Workspace\run-pos-silent.vbs"
$IconPath = "C:\Dev\PanPanocha-Workspace\apps\pos\public\images\icon-PP.ico"

# Create WScript Shell object
$WScriptShell = New-Object -ComObject WScript.Shell

# Delete old shortcut if exists
if (Test-Path $ShortcutPath) {
    Remove-Item $ShortcutPath -Force
}

# Create shortcut
$Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetPath
$Shortcut.WorkingDirectory = "C:\Dev\PanPanocha-Workspace"
$Shortcut.Description = "Punto de Venta PanPanocha"
$Shortcut.IconLocation = $IconPath
$Shortcut.Save()

Write-Host "Acceso directo actualizado (modo silencioso)" -ForegroundColor Green
Write-Host "Ahora el POS se abrira sin mostrar la terminal" -ForegroundColor Cyan
