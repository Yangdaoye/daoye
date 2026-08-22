@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在打开校园坦克大战局域网...
echo 另一台电脑不要输入 127.0.0.1
netsh advfirewall firewall delete rule name="校园坦克大战" >nul 2>nul
netsh advfirewall firewall add rule name="校园坦克大战" dir=in action=allow protocol=TCP localport=8765 >nul 2>nul
where node >nul 2>nul
if %errorlevel%==0 (
  node scripts\serve.js
) else (
  echo 没有 Node.js，改用 Python 打开...
  python -m http.server 8765 --bind 0.0.0.0
)
pause
