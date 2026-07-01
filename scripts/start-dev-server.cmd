@echo off
cd /d "%~dp0.."
set CI=true
pnpm.cmd dev > ".logs\next-dev.log" 2> ".logs\next-dev.err.log"
