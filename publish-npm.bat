@echo off
goto :dsh_lfaa_publish_start
rem File: publish-npm.bat
rem Launches the PowerShell menu for npm publishing and GitHub pushes.
rem Keep this launcher ASCII-only and CRLF so cmd.exe never parses UTF-8 text.
:dsh_lfaa_publish_start
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0" || exit /b 1
where powershell.exe >nul 2>nul
if errorlevel 1 exit /b 1
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\publish-menu.ps1"
exit /b %ERRORLEVEL%
