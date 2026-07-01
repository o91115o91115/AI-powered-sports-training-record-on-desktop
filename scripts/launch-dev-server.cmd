@echo off
cd /d "%~dp0.."
start "next-dev-server" /min cmd.exe /c call "%~dp0start-next-direct.cmd"
