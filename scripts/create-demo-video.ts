import { chromium, Browser, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import http from 'http';

const OUTPUT_VIDEO = process.env.OUTPUT_VIDEO || 'demo/heimdall-demo.webm';
const DEMO_DIR = path.dirname(OUTPUT_VIDEO);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PREVIEW_PORT = 4173;
const PREVIEW_URL = `http://localhost:${PREVIEW_PORT}`;

async function waitForServer(url: string, timeoutMs = 10000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.get(url, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode < 500) resolve();
          else reject(new Error(`status ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(1000, () => req.destroy(new Error('timeout')));
      });
      return;
    } catch {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function startPreviewServer(): Promise<ChildProcess> {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PREVIEW_PORT), '--strictPort'], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
  });
  await waitForServer(PREVIEW_URL);
  return server;
}

const chromeMock = `
  window.chrome = {
    runtime: { openOptionsPage: function() {} },
    tabs: { create: function() {} }
  };
`;

const LS_SETUP = `
  localStorage.setItem('Heimdall.Feeds', JSON.stringify({
    'HN': 'https://news.ycombinator.com/rss',
    'LWN': 'https://lwn.net/headlines/rss',
    'OWID': 'https://ourworldindata.org/atom.xml'
  }));
  localStorage.setItem('HN', JSON.stringify([
    { Title: 'HN Article 1', Link: 'https://example.com/hn1', CommentsLink: 'https://news.ycombinator.com/item?id=1' },
    { Title: 'HN Article 2', Link: 'https://example.com/hn2', CommentsLink: 'https://news.ycombinator.com/item?id=2' },
    { Title: 'HN Article 3', Link: 'https://example.com/hn3', CommentsLink: 'https://news.ycombinator.com/item?id=3' }
  ]));
  localStorage.setItem('LWN', JSON.stringify([
    { Title: 'LWN Article 1', Link: 'https://lwn.net/Articles/1', CommentsLink: '' },
    { Title: 'LWN Article 2', Link: 'https://lwn.net/Articles/2', CommentsLink: '' },
    { Title: 'LWN Article 3', Link: 'https://lwn.net/Articles/3', CommentsLink: '' }
  ]));
  localStorage.setItem('OWID', JSON.stringify([
    { Title: 'OWID Article 1', Link: 'https://example.com/owid1', CommentsLink: '' },
    { Title: 'OWID Article 2', Link: 'https://example.com/owid2', CommentsLink: '' },
    { Title: 'OWID Article 3', Link: 'https://example.com/owid3', CommentsLink: '' }
  ]));
`;

function popupUrl(): string {
  return 'http://localhost:4173/popup/popup.html';
}

function dashboardUrl(): string {
  return 'http://localhost:4173/dashboard/dashboard.html';
}

async function sleep(page: Page, ms: number): Promise<void> {
  await page.waitForTimeout(ms);
}

async function recordDemo(): Promise<void> {
  console.log('Starting vite preview server...');
  const server = await startPreviewServer();

  console.log('Launching Chromium...');
  const browser: Browser = await chromium.launch({ headless: true });

  const context: BrowserContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: DEMO_DIR, size: { width: 1280, height: 800 } },
  });

  const page: Page = await context.newPage();

  // ---- SCENE 1: Popup ----
  console.log('[1/11] Opening popup...');
  await page.addInitScript(chromeMock);
  await page.addInitScript(LS_SETUP);
  await page.goto(popupUrl());
  await sleep(page, 2500);

  // ---- SCENE 2: Switch to HN tab ----
  console.log('[2/11] Switching to HN tab...');
  await page.click('button[data-feed="HN"]');
  await sleep(page, 1500);

  // ---- SCENE 3: Switch to LWN tab ----
  console.log('[3/11] Switching to LWN tab...');
  await page.click('button[data-feed="LWN"]');
  await sleep(page, 1500);

  // ---- SCENE 4: Navigate to Dashboard ----
  console.log('[4/11] Opening dashboard...');
  await page.goto(dashboardUrl());
  await sleep(page, 2500);

  // ---- SCENE 5: Open article preview ----
  console.log('[5/11] Opening article preview...');
  const firstArticle = page.locator('.article-title').first();
  await firstArticle.click();
  await sleep(page, 2000);

  // ---- SCENE 6: Close preview ----
  console.log('[6/11] Closing preview...');
  await page.click('#close-preview-btn');
  await sleep(page, 1000);

  // ---- SCENE 7: Navigate to LWN individual feed via sidebar ----
  console.log('[7/11] Navigating to LWN feed via sidebar...');
  await page.locator('.nav-item[data-feed="LWN"]').click();
  await sleep(page, 1500);

  // ---- SCENE 8: Go to Settings ----
  console.log('[8/11] Opening Settings...');
  await page.locator('.nav-item[data-view="settings"]').click();
  await sleep(page, 1500);

  // Auto-accept all dialogs (alert/confirm) from here on
  page.on('dialog', dialog => dialog.accept());

  // ---- SCENE 9: Add a new feed ----
  console.log('[9/11] Adding a new feed...');
  await page.fill('#new-feed-name', 'Custom Feed');
  await page.fill('#new-feed-url', 'https://example.com/custom.rss');
  await page.click('#add-feed-btn');
  await sleep(page, 1000);

  // ---- SCENE 10: Unsubscribe OWID ----
  console.log('[10/11] Unsubscribing OWID...');
  await page.locator('button:has-text("Unsubscribe")').last().click();
  await sleep(page, 1000);

  // ---- SCENE 11: Back to Home ----
  console.log('[11/11] Returning to Home...');
  await page.locator('.nav-item[data-view="home"]').click();
  await sleep(page, 2000);

  await context.close();
  await browser.close();
  server.kill();

  // Rename the auto-named video to the desired output path
  const files = fs.readdirSync(DEMO_DIR).filter(f => f.endsWith('.webm'));
  if (files.length > 0) {
    const src = path.join(DEMO_DIR, files[0]);
    fs.renameSync(src, OUTPUT_VIDEO);
  }

  console.log('Demo video saved to ' + OUTPUT_VIDEO);
}

recordDemo().catch(err => {
  console.error('Demo recording failed:', err);
  process.exit(1);
});
