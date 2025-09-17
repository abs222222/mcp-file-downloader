## Adding New ETF to V2 Pipeline

### Step 1: Download the ETF Holdings File
```javascript
// Find official download URL from provider website
// Download using file-downloader MCP
download_file(
  url: "https://provider.com/etf/XXX/holdings.csv",
  filename: "./etfs/XXX_holdings.csv"  // Or full path like ~/Downloads/etfs/XXX_holdings.csv
)
// If "Too many redirects" error → use_browser: true
```

### Step 2: Analyze File Structure
Create analysis script to find column positions:
```javascript
// analyze_XXX.js
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'etfs', 'XXX_holdings.csv');

// Read file (CSV or XLSX)
const csv = fs.readFileSync(filePath, 'utf8');
const workbook = XLSX.read(csv, { type: 'string' });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// Show header and first 5 data rows
console.log('Headers:', data[0]);
for (let i = 1; i < 6; i++) {
  console.log(`Row ${i}:`, data[i]);
}
```

### Step 3: Identify Column Mappings
Look for:
- **Ticker column**: Stock symbols (NVDA, MSFT, etc.)
- **Name column**: Company names
- **Weight column**: Portfolio percentages
- **Shares column**: Number of shares held
- **Start row**: Where actual data begins (after headers)

### Step 4: Check Weight Format
```javascript
// Sum weights to determine format
let totalWeight = 0;
for (let i = startRow; i < data.length; i++) {
  totalWeight += parseFloat(data[i][weightCol]) || 0;
}
console.log('Total weight:', totalWeight);
// If ~1.0 → weightIsDecimal: true (multiply by 100)
// If ~100 → weightIsDecimal: false (already percentages)
```

### Step 5: Add to etf_config.js
```javascript
{
  ticker: 'XXX',
  name: 'ETF Full Name',
  filename: 'XXX_holdings.csv',  // or .xlsx
  url: 'https://provider.com/etf/XXX/holdings',
  format: 'provider',  // spdr, ishares, ark, vaneck, etc.
  parsing: {
    tickerCol: ?,        // Column index (0-based)
    nameCol: ?,          // Column index
    weightCol: ?,        // Column index
    sharesCol: ?,        // Column index
    startRow: ?,         // Row where data starts (0-based)
    hasWeight: true,     // Does file include weights?
    weightIsDecimal: false,  // true if weights sum to ~1.0
    isCSV: true,         // true for CSV, false for XLSX
    isXLSX: false        // true for XLSX, false for CSV
  }
}
```

### Step 6: Test the Configuration
```bash
# Run the pipeline
node etf_master.js

# Check output for:
# 1. "✓ Found X holdings" for your ETF
# 2. ETF appears in Weight Matrix columns
# 3. Individual ETF tab created
# 4. No error messages
```

### Common Provider Patterns (Copy These!)

**SPDR ETFs (SPY, XLK, XLF, etc.)**
```javascript
parsing: {
  tickerCol: 1, nameCol: 0, weightCol: 4, sharesCol: 6,
  startRow: 5, hasWeight: true, isXLSX: true
}
```

**iShares CSV (IGV, ITA, SOXX)**
```javascript
parsing: {
  tickerCol: 0, nameCol: 1, weightCol: 5, sharesCol: 7,
  startRow: 10, hasWeight: true, isCSV: true
}
```

**Invesco (QQQ)**
```javascript
parsing: {
  tickerCol: 2, nameCol: 6, weightCol: 5, sharesCol: 3,
  startRow: 1, hasWeight: true, isXLSX: true
}
```

**ARK CSV (ARKK, ARKQ, etc.)**
```javascript
parsing: {
  tickerCol: 3, nameCol: 2, weightCol: 7, sharesCol: 5,
  startRow: 1, hasWeight: true, weightIsDecimal: true, isCSV: true
}
```

**VanEck (SMH)**
```javascript
parsing: {
  tickerCol: 1, nameCol: 2, weightCol: 8, sharesCol: 4,
  startRow: 3, hasWeight: true, isXLSX: true
}
```

### Special Cases Already Handled
✅ **Decimal weights** (0.1232 → 12.32%) - Set `weightIsDecimal: true`
✅ **Percentage symbols** ("12.32%" → 12.32) - Automatic
✅ **Comma separators** ("1,234,567" → 1234567) - Automatic
✅ **Country codes** ("NVDA US" → "NVDA") - Automatic
✅ **Footer text** - Stops at rows with >100 chars
✅ **Small holdings** - Filtered if <0.1% (except SPY/QQQ)
✅ **Cash/derivatives** - Automatically skipped

### Testing Checklist
- [ ] File downloads successfully
- [ ] Column mappings correct (ticker, name, weight match)
- [ ] Weight totals ~100% (after any conversion)
- [ ] ETF appears in all tabs (Master, Matrix, Stats, Individual)
- [ ] No duplicate ETF names in lists
- [ ] Holdings count reasonable (20-500 typical)

### If Something Goes Wrong
1. **Wrong columns?** → Check actual file with analysis script
2. **Weights wrong?** → Check if decimal format (sum to 1.0)
3. **Missing holdings?** → Check startRow, maybe headers on different row
4. **Parser errors?** → Check isCSV vs isXLSX setting
5. **Download fails?** → Try use_browser: true

### Remember!
- Update Weight Matrix will include new ETF automatically
- Statistics tab will count new ETF automatically
- Individual tab created automatically
- Master List sorted by average weight across ALL ETFs (including new one)

---# Claude Hints for File Downloader MCP v1.2.1

## Capabilities (as of v1.2.1)
- **HTTP download** with 10-level redirect support
- **Browser download** using Playwright (headless Chromium)
- **Automatic fallback** from HTTP → Browser on errors
- **Force browser mode** with `use_browser: true` parameter
- **Handles immediate downloads** (VanEck pattern)

## ETF Download Workflow

### When User Asks to Download ETFs:
1. **Check the config file** at:
   `C:\Users\adam_\Downloads\mcp-downloads-v2\etf_config.js`

2. **Try standard download first** (HTTP mode):
   ```javascript
   download_file(
     url: "https://...",
     filename: "C:\\Users\\adam_\\Downloads\\mcp-downloads-v2\\etfs\\TICKER_holdings.xlsx"
   )
   ```

3. **If you see "Too many redirects" error**, force browser mode:
   ```javascript
   download_file(
     url: "https://...",
     filename: "C:\\Users\\adam_\\Downloads\\mcp-downloads-v2\\etfs\\TICKER_holdings.xlsx",
     use_browser: true
   )
   ```

## Provider-Specific Patterns

### HTTP Download Works (Fast)
| Provider | Example | Pattern |
|----------|---------|---------|
| SPDR/State Street | SPY, XL* sectors | `holdings-daily-us-en-{ticker}.xlsx` |
| iShares | IGV, ITA, SOXX | CSV downloads, straightforward |
| Invesco | QQQ | Direct Excel links |

### Browser Download Required (Complex)
| Provider | Example | Issue | Solution |
|----------|---------|-------|----------|
| VanEck | SMH | Immediate download trigger + redirects | `use_browser: true` |
| ARK Invest | ARKK | JavaScript-heavy site | `use_browser: true` |

### VanEck Special Case
```javascript
// VanEck URLs trigger immediate download without loading page
// This causes "Download is starting" navigation error - IT'S NORMAL!
// NOTE: VanEck serves XLSX format but names it .xls - save as .xlsx!
download_file(
  url: "https://www.vaneck.com/us/en/investments/semiconductor-etf-smh/downloads/holdings/",
  filename: "C:\\Users\\adam_\\Downloads\\mcp-downloads-v2\\etfs\\SMH_holdings.xlsx",
  use_browser: true  // REQUIRED for VanEck
)
```

## When User Reports Download Issues

### "Too many redirects (>10)" Error
**Solution:** Use browser mode
```javascript
use_browser: true
```

### "Download is starting" Error  
**This is EXPECTED for VanEck!** The download succeeded.

### "HTTP 404/403/500" Errors
1. **URL might have changed** - Search for new URL
2. **Try browser mode** - Some sites block non-browser requests
3. **Check if manual download works** - If yes, URL is good but needs browser

### MCP Not Working
```powershell
# Test directly in terminal
node C:\Users\adam_\projects\mcp-file-downloader\download-server.js

# Should show: "MCP File Downloader server running..."
# If blinking cursor appears, it's working (Ctrl+C to exit)
```

## When User Wants to Add New ETF

1. **Find official download URL** (provider website)
2. **Test download** with file-downloader
3. **If it fails**, try `use_browser: true`
4. **Analyze structure** using repl with XLSX:
   ```javascript
   import * as XLSX from 'xlsx';
   const workbook = XLSX.read(await window.fs.readFile('path'), {type:'buffer'});
   console.log(workbook.SheetNames);
   ```
5. **Update etf_config.js** with URL and parsing config

## Architecture Notes

### Why We Don't Use Puppeteer MCP
- Often breaks/fails to load
- Less reliable than our custom solution
- Our file-downloader with Playwright is better

### Evolution of This Tool
- v1.0.0: Basic HTTP download
- v1.1.0: Added redirect support (max 10)
- v1.2.0: Added Playwright browser fallback
- v1.2.1: Fixed immediate download handling (VanEck)

### Technical Implementation
```javascript
// Try HTTP first (fast)
try {
  return await httpDownload(url, filePath);
} catch (httpError) {
  // Fallback to browser if redirects or errors
  if (httpError.message.includes('Too many redirects')) {
    return await browserDownload(url, filePath);
  }
}
```

## Key Paths
- **This MCP**: `C:\Users\adam_\projects\mcp-file-downloader\`
- **V2 Config**: `C:\Users\adam_\Downloads\mcp-downloads-v2\etf_config.js`
- **V2 ETFs**: `C:\Users\adam_\Downloads\mcp-downloads-v2\etfs\`
- **V2 Output**: `C:\Users\adam_\Downloads\mcp-downloads-v2\Master_Ticker_Complete.xlsx`

## Restart Claude Desktop After Updates
When you update download-server.js:
1. Save the file
2. Fully quit Claude (check system tray)
3. Restart Claude Desktop
4. Test with a simple download

## Dependencies
- Node.js 18+
- @modelcontextprotocol/sdk
- playwright (for browser downloads)
- xlsx (for parsing in v2 system)

---
Last updated: September 16, 2025
Version: 1.2.1
