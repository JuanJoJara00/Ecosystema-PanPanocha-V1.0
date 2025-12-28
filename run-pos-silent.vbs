' VBScript to run POS without showing console window
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run """C:\Dev\PanPanocha-Workspace\run-pos.bat""", 0, False
Set WshShell = Nothing
