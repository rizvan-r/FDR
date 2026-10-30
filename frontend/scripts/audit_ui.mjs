import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const PAGES = [
  { name: 'dashboard', url: 'http://localhost:5173/dashboard' },
  { name: 'fdrs_list', url: 'http://localhost:5173/fdrs' },
  { name: 'fdr_detail', url: 'http://localhost:5173/fdrs/fdr-001' },
  { name: 'renewals', url: 'http://localhost:5173/renewals' },
  { name: 'officer_dashboard', url: 'http://localhost:5173/officer/dashboard' },
  { name: 'officer_queue', url: 'http://localhost:5173/officer/queue' },
  { name: 'migrations', url: 'http://localhost:5173/migrations' },
  { name: 'compliance', url: 'http://localhost:5173/compliance' },
  { name: 'releases', url: 'http://localhost:5173/releases' },
  { name: 'refunds', url: 'http://localhost:5173/releases/refunds' },
];

async function runAudit() {
  console.log('🚀 Starting Playwright UI Audit using Edge channel...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  const findings = [];

  // Log in as System Admin
  console.log('🔑 Logging in as System Admin...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.click('button:has-text("System Admin")');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  console.log('✅ Successfully logged in as System Admin!');

  for (const item of PAGES) {
    console.log(`\n🔍 Auditing: ${item.name} (${item.url})`);
    try {
      await page.goto(item.url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000); // Allow render stabilization

      // 1. Take full-page screenshot
      const shotPath = path.join(SCREENSHOT_DIR, `${item.name}.png`);
      await page.screenshot({ path: shotPath, fullPage: true });

      // 2. Check for page-level horizontal overflow
      const pageOverflow = await page.evaluate(() => {
        const docEl = document.documentElement;
        return {
          scrollWidth: docEl.scrollWidth,
          clientWidth: docEl.clientWidth,
          hasOverflow: docEl.scrollWidth > docEl.clientWidth,
        };
      });

      if (pageOverflow.hasOverflow) {
        findings.push({
          page: item.name,
          type: 'OVERFLOW',
          message: `Horizontal page overflow detected: scrollWidth ${pageOverflow.scrollWidth}px > clientWidth ${pageOverflow.clientWidth}px`,
        });
      }

      // 3. Scan DOM for unwanted texts (e.g. "Phase X", "SIH", "Hackathon")
      const textMatches = await page.evaluate(() => {
        const results = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        const regex = /\b(Phase\s+\d+|SIH|Hackathon|mock\s+phase)\b/i;

        while ((node = walker.nextNode())) {
          const val = node.nodeValue?.trim();
          if (val && regex.test(val)) {
            const parent = node.parentElement;
            if (parent && !['SCRIPT', 'STYLE'].includes(parent.tagName)) {
              results.push({
                text: val,
                tagName: parent.tagName,
                className: parent.className,
              });
            }
          }
        }
        return results;
      });

      if (textMatches.length > 0) {
        findings.push({
          page: item.name,
          type: 'UNWANTED_TEXT',
          matches: textMatches,
        });
      }

      // 4. Check for misaligned cards or overflowing elements inside containers
      const elementOverflows = await page.evaluate(() => {
        const issues = [];
        const allEls = document.querySelectorAll('*');
        for (const el of allEls) {
          if (el.scrollWidth > el.clientWidth + 5 && el.clientWidth > 0) {
            const style = window.getComputedStyle(el);
            if (style.overflowX !== 'auto' && style.overflowX !== 'scroll' && el.tagName !== 'HTML' && el.tagName !== 'BODY') {
              // check if text is clipped
              issues.push({
                tag: el.tagName,
                className: (el.className || '').toString().slice(0, 80),
                scrollWidth: el.scrollWidth,
                clientWidth: el.clientWidth,
              });
            }
          }
        }
        return issues.slice(0, 5); // limit report
      });

      if (elementOverflows.length > 0) {
        findings.push({
          page: item.name,
          type: 'ELEMENT_OVERFLOW',
          issues: elementOverflows,
        });
      }

      console.log(`  ✓ Finished ${item.name}. Unwanted texts found: ${textMatches.length}`);
    } catch (err) {
      console.error(`  ❌ Error auditing ${item.name}:`, err.message);
      findings.push({
        page: item.name,
        type: 'ERROR',
        message: err.message,
      });
    }
  }

  await browser.close();

  console.log('\n================ AUDIT SUMMARY ================');
  console.log(JSON.stringify(findings, null, 2));

  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'audit_report.json'),
    JSON.stringify(findings, null, 2)
  );
}

runAudit().catch(console.error);
