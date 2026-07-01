@echo off
cd /d "%~dp0.."
set CI=true
node ".\node_modules\next\dist\bin\next" dev > ".logs\next-dev.log" 2> ".logs\next-dev.err.log"
