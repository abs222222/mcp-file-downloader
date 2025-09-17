#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import { createWriteStream, existsSync } from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';
import http from 'http';
import { chromium } from 'playwright';

// Helper function to download a file using HTTP (with redirect support)
async function httpDownload(url, filePath, redirectCount = 0) {
  const maxRedirects = 10;
  
  return new Promise((resolve, reject) => {
    if (redirectCount > maxRedirects) {
      reject(new Error(`Too many redirects (>${maxRedirects})`));
      return;
    }
    
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (response) => {
      // Handle redirects (301, 302, 303, 307, 308)
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        const redirectUrl = response.headers.location;
        if (!redirectUrl) {
          reject(new Error(`Redirect ${response.statusCode} but no location header`));
          return;
        }
        
        // Handle relative redirects
        let newUrl = redirectUrl;
        if (!redirectUrl.startsWith('http')) {
          const baseUrl = new URL(url);
          newUrl = new URL(redirectUrl, baseUrl).toString();
        }
        
        console.error(`Following redirect: ${url} -> ${newUrl}`);
        
        // Recursively follow the redirect
        httpDownload(newUrl, filePath, redirectCount + 1)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      // Check for success
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      // Download the file
      const file = createWriteStream(filePath);
      let size = 0;
      
      response.on('data', (chunk) => {
        size += chunk.length;
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve({ size, method: 'http' });
      });
      
      file.on('error', (err) => {
        file.close();
        fs.unlink(filePath).catch(() => {});
        reject(err);
      });
      
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Helper function to download using Playwright browser
async function browserDownload(url, filePath) {
  let browser = null;
  
  try {
    console.error('Launching browser for download...');
    browser = await chromium.launch({ 
      headless: true,
      downloadsPath: path.dirname(filePath)
    });
    
    const context = await browser.newContext({
      acceptDownloads: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    const page = await context.newPage();
    
    // Set up download handler BEFORE navigation
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    
    // Navigate to URL (might trigger immediate download)
    console.error(`Navigating to: ${url}`);
    try {
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
    } catch (navError) {
      // If navigation fails because download started, that's OK
      if (navError.message.includes('Download is starting')) {
        console.error('Immediate download detected');
      } else {
        throw navError;
      }
    }
    
    // Check if a download was triggered
    let download = null;
    try {
      download = await Promise.race([
        downloadPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('No download started')), 5000))
      ]);
    } catch (e) {
      // No automatic download, might need to click something
      console.error('No automatic download detected, looking for download links...');
      
      // Try common download link patterns
      const selectors = [
        'a[href*=".xls"]',
        'a[href*=".xlsx"]',
        'a[href*=".csv"]',
        'a[href*="download"]',
        'a[download]',
        'button:has-text("download")',
        'a:has-text("download")',
        'a:has-text("export")',
        'a:has-text("holdings")'
      ];
      
      for (const selector of selectors) {
        const link = await page.$(selector);
        if (link) {
          console.error(`Found download link with selector: ${selector}`);
          const downloadPromise2 = page.waitForEvent('download', { timeout: 10000 });
          await link.click();
          download = await downloadPromise2;
          break;
        }
      }
    }
    
    if (!download) {
      throw new Error('Could not trigger download from page');
    }
    
    // Save the download
    console.error('Download started, saving file...');
    await download.saveAs(filePath);
    
    // Get file size
    const stats = await fs.stat(filePath);
    
    await browser.close();
    
    return { size: stats.size, method: 'browser' };
    
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

// Main download function that tries HTTP first, then browser
async function downloadFile(url, filePath, useBrowser = false) {
  if (useBrowser) {
    console.error('Using browser download method...');
    return await browserDownload(url, filePath);
  }
  
  // Try HTTP download first
  try {
    console.error('Trying HTTP download with redirect support...');
    return await httpDownload(url, filePath);
  } catch (httpError) {
    console.error(`HTTP download failed: ${httpError.message}`);
    
    // If HTTP fails with too many redirects or other issues, try browser
    if (httpError.message.includes('Too many redirects') || 
        httpError.message.includes('HTTP 4') ||
        httpError.message.includes('HTTP 5')) {
      console.error('Falling back to browser download...');
      try {
        return await browserDownload(url, filePath);
      } catch (browserError) {
        // If both fail, return the original HTTP error
        throw new Error(`HTTP failed: ${httpError.message}, Browser failed: ${browserError.message}`);
      }
    }
    
    throw httpError;
  }
}

const server = new Server(
  {
    name: 'file-downloader',
    version: '1.2.1',  // Fixed immediate download handling
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'download_file',
        description: 'Download a file from URL (supports redirects and browser download)',
        inputSchema: {
          type: 'object',
          properties: {
            url: { 
              type: 'string', 
              description: 'URL to download' 
            },
            filename: { 
              type: 'string', 
              description: 'Save as filename (optional). Can be absolute path.' 
            },
            use_browser: {
              type: 'boolean',
              description: 'Force browser download method (for JavaScript-heavy sites). Default: false',
              default: false
            }
          },
          required: ['url']
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'download_file') {
    const { url, filename, use_browser } = request.params.arguments;
    
    try {
      let filePath;
      
      if (filename && path.isAbsolute(filename)) {
        // If filename is an absolute path, use it directly
        filePath = filename;
        // Create the directory if it doesn't exist
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
      } else {
        // Use the default download directory
        const downloadDir = path.join(os.homedir(), 'Downloads', 'mcp-downloads');
        await fs.mkdir(downloadDir, { recursive: true });
        
        let fname = filename;
        if (!fname) {
          try {
            const urlPath = new URL(url).pathname;
            fname = path.basename(urlPath) || 'download';
          } catch {
            fname = 'download';
          }
        }
        
        filePath = path.join(downloadDir, fname);
      }
      
      const result = await downloadFile(url, filePath, use_browser);
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Downloaded successfully!
URL: ${url}
Method: ${result.method}
Saved to: ${filePath}
Size: ${result.size} bytes`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Download failed!
URL: ${url}
Error: ${error.message}`
          }
        ]
      };
    }
  }
  
  return {
    content: [
      {
        type: 'text',
        text: `Unknown tool: ${request.params.name}`
      }
    ]
  };
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP File Downloader server running (v1.2.1 with browser support + immediate downloads)...');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
