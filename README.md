# MCP File Downloader 🚀

A Model Context Protocol (MCP) server that enables Claude Desktop to download files from the web, with automatic browser fallback for JavaScript-heavy sites.

[![MCP Version](https://img.shields.io/badge/MCP-1.0.0-blue)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

## 🎯 Why This Exists

Claude Desktop can't natively download files. This MCP server bridges that gap, providing:
- Direct HTTP downloads with smart redirect handling
- Automatic browser-based fallback for complex sites
- Seamless integration with Claude Desktop

Perfect for downloading datasets, documents, and files from sites that use JavaScript for download links.

## ✨ Features

- **Smart Download Strategy**: Tries HTTP first, falls back to browser if needed
- **10-Level Redirect Support**: Handles complex redirect chains
- **JavaScript Rendering**: Uses Playwright for sites requiring browser execution
- **Flexible File Naming**: Auto-names from URL or accepts custom names
- **Cross-Platform**: Works on Windows, macOS, and Linux

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Claude Desktop

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mcp-file-downloader.git
cd mcp-file-downloader
```

2. Install dependencies:
```bash
npm install
```

3. Add to Claude Desktop config:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "file-downloader": {
      "command": "node",
      "args": ["C:\\path\\to\\mcp-file-downloader\\download-server.js"]
    }
  }
}
```

4. Restart Claude Desktop

## 📖 Usage

In Claude Desktop, you can now download files:

```
"Download this file: https://example.com/data.csv"

"Get the PDF from https://example.com/report.pdf and save it as quarterly_report.pdf"

"Download https://site-with-javascript.com/dynamic-file.xlsx" 
(automatically uses browser if HTTP fails)
```

### Parameters

- **url** (required): The URL to download from
- **filename** (optional): Save as this filename. Can include full path
- **use_browser** (optional): Force browser download method

## 🔧 Advanced Usage

### Force Browser Mode
For sites that always need JavaScript:
```
"Download https://complex-site.com/file.zip using browser mode"
```

### Custom Save Location
```
"Download https://example.com/data.csv to ~/Documents/mydata.csv"
```

## 📂 Project Structure

```
mcp-file-downloader/
├── download-server.js    # MCP server implementation
├── package.json          # Dependencies
├── LICENSE              # MIT license
├── README.md           # This file
└── CLAUDE_HINTS.md     # Advanced documentation
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Setup

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🐛 Troubleshooting

### "Too many redirects" error
The site likely requires JavaScript. Use `use_browser: true` parameter.

### Downloads failing
Check that Node.js has write permissions to your download directory.

### Claude doesn't see the tool
1. Verify the path in claude_desktop_config.json is correct
2. Fully quit Claude Desktop (check system tray)
3. Restart Claude Desktop

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for the [Model Context Protocol](https://modelcontextprotocol.io) ecosystem
- Uses [Playwright](https://playwright.dev) for browser automation
- Inspired by the need to download ETF holdings data in Claude Desktop

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Note**: This is an independent project and not officially affiliated with Anthropic or Claude.