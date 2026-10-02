/**
 * TEDDY Flow Diagram — PDF Exporter (High-Quality)
 *
 * Strategy:
 *  - Viewport 1700px wide so Mermaid has space to lay out cleanly
 *  - deviceScaleFactor 2 for crisp sub-pixel rendering
 *  - PDF format: A2 Landscape (594 × 420 mm) — wide enough that content
 *    never needs to shrink more than ~10%, keeping 20px Mermaid text ≥ 14pt
 *  - scale: 1.25 inside the PDF so nodes and labels are visibly large
 *  - printBackground: true so all colours render
 *  - Multi-page: Chrome paginates automatically; diagrams flow across pages
 *    so nothing is squashed onto a single tiny sheet
 */

const puppeteer = require('puppeteer');
const path      = require('path');
const fs        = require('fs');

const FLOWS = [
  { file: 'USER_FLOW.html',   label: 'Client / User Flow'    },
  { file: 'VENDOR_FLOW.html', label: 'Vendor Dashboard Flow' },
  { file: 'STAFF_FLOW.html',  label: 'Staff Portal Flow'     },
  { file: 'ADMIN_FLOW.html',  label: 'Admin Panel Flow'      },
];

const DIR_FLOWS = path.resolve(__dirname);
const DIR_PDF   = path.join(DIR_FLOWS, 'pdf');
if (!fs.existsSync(DIR_PDF)) fs.mkdirSync(DIR_PDF, { recursive: true });

// ─── helpers ──────────────────────────────────────────────────────────────────

function fileUrl(filePath) {
  // Convert Windows path → file:/// URL
  return 'file:///' + filePath.replace(/\\/g, '/');
}

// ─── main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log('\n🚀  TEDDY PDF Exporter — High-Quality Mode');
  console.log('    Format : A2 Landscape (594 × 420 mm), multi-page');
  console.log('    Font   : 20 px Mermaid nodes');
  console.log('    DPI    : 2× device scale (crisp rendering)\n');

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--allow-file-access-from-files',
    ],
  });

  for (const { file, label } of FLOWS) {
    const htmlPath = path.join(DIR_FLOWS, file);
    const pdfName  = file.replace('.html', '.pdf');
    const pdfPath  = path.join(DIR_PDF, pdfName);

    console.log(`📄  ${label}`);
    console.log(`    Source : ${file}`);

    const page = await browser.newPage();

    // Wide viewport so Mermaid has plenty of room; 2× pixel density
    await page.setViewport({ width: 1700, height: 960, deviceScaleFactor: 2 });

    // ── Load page ──────────────────────────────────────────────────────────
    await page.goto(fileUrl(htmlPath), {
      waitUntil: 'networkidle0',
      timeout  : 60_000,
    });

    // ── Wait for Mermaid SVG to appear ─────────────────────────────────────
    await page.waitForFunction(
      () => document.querySelectorAll('.mermaid svg').length > 0,
      { timeout: 30_000 }
    );

    // Extra settle: let all nodes, edges and labels finish painting
    await new Promise(r => setTimeout(r, 3_000));

    // ── Inject extra CSS to improve legibility ─────────────────────────────
    await page.addStyleTag({ content: `
      /* Ensure SVG text is crisp and not antialiased away */
      .mermaid svg text {
        font-family: Arial, sans-serif !important;
        font-weight: 500 !important;
        paint-order: stroke fill;
      }
      /* Slightly thicker edges for better contrast */
      .mermaid svg .edge path,
      .mermaid svg .flowchart-link {
        stroke-width: 2px !important;
      }
      /* Hide the horizontal scrollbar that some themes add */
      body { overflow-x: hidden; }
    ` });

    // Short settle after style injection
    await new Promise(r => setTimeout(r, 500));

    // ── Measure actual rendered content ───────────────────────────────────
    const { w, h } = await page.evaluate(() => ({
      w: document.body.scrollWidth,
      h: document.body.scrollHeight,
    }));
    console.log(`    Canvas : ${w} × ${h} px`);

    // ── Export to PDF ──────────────────────────────────────────────────────
    //
    //  A2 Landscape in puppeteer = 594 mm × 420 mm
    //  At 96 CSS px/inch:  594/25.4*96 = 2245 px  ×  420/25.4*96 = 1587 px
    //  Our viewport is 1700 px wide.
    //  In PDF points:  1700 px × (72pt/96px) = 1275 pt
    //  A2 landscape printable width (minus 12 mm margins each side):
    //    (594 - 24) mm = 570 mm = 1617 pt
    //  scale = 1617 / 1275 ≈ 1.27  →  we use 1.25 to stay safely inside margins
    //
    //  Result: 20 px Mermaid font × 1.25 × (72/96) = 18.75 pt per node label
    //  At "fit-width" view on a 1920 px monitor → A2 landscape appears at ~85%
    //  Effective text size on screen:  18.75 pt × 0.85 ≈ 16 pt  ✅ readable
    //
    await page.pdf({
      path           : pdfPath,
      format         : 'A2',
      landscape      : true,
      printBackground: true,
      scale          : 1.25,
      margin         : { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
    });

    await page.close();

    const sizeMB = (fs.statSync(pdfPath).size / 1024 / 1024).toFixed(2);
    console.log(`    ✅  Saved → pdf/${pdfName}  (${sizeMB} MB)\n`);
  }

  await browser.close();
  console.log('🎉  All 4 PDFs exported — open any file in a PDF viewer.\n');
  console.log('TIP: Set your PDF viewer to "Fit Page Width" for best readability.');
  console.log('     Diagrams that are taller than one A2 page flow across pages.\n');
})();
