@echo off
echo 🚀 Initializing MCP File Downloader repository...

rem Initialize git
git init

rem Add all files
git add .

rem Create initial commit
git commit -m "Initial commit: MCP file downloader with browser fallback" -m "" -m "- HTTP downloads with redirect support" -m "- Automatic browser fallback using Playwright" -m "- MCP server for Claude Desktop integration" -m "- Comprehensive documentation"

echo.
echo ✅ Repository initialized!
echo.
echo Next steps:
echo 1. Create repository on GitHub
echo 2. Add remote: git remote add origin https://github.com/yourusername/mcp-file-downloader.git
echo 3. Push: git push -u origin main
pause