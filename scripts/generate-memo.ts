import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

async function generateMemoPdf() {
  console.log('Generating Founder Memo PDF...');

  const pdfDoc = await PDFDocument.create();
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const memoContent = [
    { type: 'title', text: 'EXECUTIVE MEMORANDUM' },
    { type: 'meta', text: 'TO: Founder & CEO, D2C Haircare Brand | FROM: AI Automation Engineer | DATE: Oct 31, 2026' },
    { type: 'meta', text: 'SUBJECT: COD Compass — Pre-Shipment COD Decision Engine & Operations-Marketing Reconciliation' },
    { type: 'divider' },
    { type: 'h2', text: 'Executive Summary' },
    { type: 'body', text: 'Cash on Delivery (COD) represents 55% of our 3,000 monthly orders (~1,650 orders/month) with an observed 28.4% Return to Origin (RTO) rate. Every RTO incurs an unrecoverable cash loss of Rs 169.40 (forward shipping Rs 65, reverse shipping Rs 65, packaging Rs 25, and expected damage of 8% on Rs 180 product cost). This burns approx Rs 78,000 every month in avoidable fulfillment losses.' },
    { type: 'body', text: 'However, Operations\' proposal to automatically cancel risky orders and blacklist pincodes would destroy our business. With a Meta Customer Acquisition Cost (CAC) of Rs 300+, cancelling first-time buyers throws away profitable sales and wastes ad spend. COD Compass reconciles this conflict using money (Rs), transparent economics, and Bayesian risk shrinkage.' },
    { type: 'h2', text: '1. What Surprised Us in the Data (3 Real Findings)' },
    { type: 'body', text: '• Pincode Sparsity (97.19% with <5 orders): Out of 1,066 distinct pincodes, 1,036 have fewer than 5 orders. A blanket blacklisting rule would ban hundreds of serviceable areas based on 1 return (N=1). We apply Bayesian shrinkage to prevent false bans.' },
    { type: 'body', text: '• First-Time Buyers Carry High Volume: First-time customers exhibit 30.23% RTO vs 22.97% for repeats (+7.27% lift). Yet 1,043 first-timers delivered successfully. Cancelling them would eliminate 73% of our revenue and waste Rs 440,000+ in Meta CAC.' },
    { type: 'body', text: '• Meta Ads Disparity: Meta-acquired traffic has 31.24% RTO vs 22.92% on Direct navigation (+8.32% lift). Meta impulse buyers need pre-dispatch intent confirmation, not channel shutdown.' },
    { type: 'body', text: '• AOV Discrepancy: Empirical mean order value is Rs 919.96 vs the Rs 649 planning benchmark. Higher order value increases delivered unit contribution, raising the break-even cancellation threshold.' },
    { type: 'h2', text: '2. Recommended Operating Rules & September 2026 Replay' },
    { type: 'body', text: 'We recommend a 4-tier policy with automatic cancellation disabled during launch: (1) Ship as-is for risk <=20%; (2) WhatsApp Confirm First for moderate risk (20%-40%) or landmark addresses; (3) Nudge to Prepaid with Rs 30 discount for orders >=Rs 300; (4) Hold for Review for risk >65% or missing postal details.' },
    { type: 'body', text: 'Replaying September 2026 (329 orders, 243 delivered, 86 RTO): allocates 1 Ship as-is, 25 Confirm First, 298 Prepaid Nudges, and 5 Held for Review. Modeled net impact delivers +Rs 390 incremental profit lift with zero customer cancellations.' },
    { type: 'h2', text: '3. Operations vs. Marketing Trade-Off with Money (Rs)' },
    { type: 'body', text: '• Meta CAC (Rs 300+) is a Sunk Cost: Ad spend happened before dispatch. Subtracting CAC from cancellation creates an erroneous double penalty. CAC is tracked separately as Marketing Exposure.' },
    { type: 'body', text: '• Break-Even Risk is 64.84%, NOT 28%: At Rs 649 AOV and 62% margin, delivered contribution G is Rs 312.38. Direct RTO loss L is Rs 169.40. Shipping has positive EV up to p = G/(G+L) = 64.84%. An order with 35% risk still delivers +Rs 143.76 expected profit.' },
    { type: 'body', text: '• The Rs 30 Prepaid Discount Math: Converting COD (28% RTO) to prepaid (4% RTO) avoids 24% return risk, saving 0.24*(312.38+169.40) = Rs 115.63 gross risk. Offering Rs 30 discount costs Rs 28.80 on delivered units, generating Rs 86.83 net gain per converted order.' },
    { type: 'h2', text: '4. What Could Go Wrong & Detection Guardrails' },
    { type: 'body', text: '• Customer Inaction: Monitored via daily WhatsApp response rate (target >82%). If response falls below 75%, confirmation thresholds are relaxed.' },
    { type: 'body', text: '• Chat Payment Traps: Customer text claiming "Paid" never marks paid. Only cryptographically verified gateway webhooks authorize dispatch.' },
    { type: 'body', text: '• Regional Courier Drift: Monitored via 14-day rolling pincode delivery tracking with automated Slack alerts.' },
    { type: 'h2', text: '5. Next Steps for the Next 2 Weeks' },
    { type: 'body', text: '1. Shadow Mode: Run COD Compass on live Shopify webhooks for 14 days without customer friction to establish empirical baselines.' },
    { type: 'body', text: '2. NDR Courier Telemetry: Ingest courier Non-Delivery Reports to trigger real-time WhatsApp re-attempt flows on day 2.' },
    { type: 'body', text: '3. Meta Cloud API: Upgrade WhatsApp simulator to official Meta Cloud API interactive buttons.' },
  ];

  // Create page
  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const margin = 40;
  let y = height - margin;

  const checkPageOverflow = (neededHeight: number) => {
    if (y - neededHeight < margin) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = height - margin;
    }
  };

  for (const item of memoContent) {
    if (item.type === 'title' && item.text) {
      checkPageOverflow(30);
      page.drawText(item.text, {
        x: margin,
        y: y - 16,
        size: 16,
        font: helveticaBold,
        color: rgb(0.07, 0.07, 0.07),
      });
      y -= 26;
    } else if (item.type === 'meta' && item.text) {
      checkPageOverflow(14);
      page.drawText(item.text, {
        x: margin,
        y: y - 10,
        size: 8.5,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= 14;
    } else if (item.type === 'divider') {
      checkPageOverflow(12);
      page.drawLine({
        start: { x: margin, y: y - 4 },
        end: { x: width - margin, y: y - 4 },
        thickness: 0.75,
        color: rgb(0.8, 0.8, 0.8),
      });
      y -= 12;
    } else if (item.type === 'h2' && item.text) {
      checkPageOverflow(24);
      y -= 8;
      page.drawText(item.text, {
        x: margin,
        y: y - 12,
        size: 11,
        font: helveticaBold,
        color: rgb(0.94, 0.27, 0.04), // Accent color
      });
      y -= 18;
    } else if (item.type === 'body' && item.text) {
      const words = item.text.split(' ');
      let line = '';
      const fontSize = 8.5;
      const lineHeight = 11.5;

      for (const word of words) {
        const testLine = line + (line ? ' ' : '') + word;
        const textWidth = timesRoman.widthOfTextAtSize(testLine, fontSize);
        if (textWidth > width - 2 * margin) {
          checkPageOverflow(lineHeight);
          page.drawText(line, {
            x: margin,
            y: y - fontSize,
            size: fontSize,
            font: timesRoman,
            color: rgb(0.12, 0.12, 0.12),
          });
          y -= lineHeight;
          line = word;
        } else {
          line = testLine;
        }
      }

      if (line) {
        checkPageOverflow(lineHeight);
        page.drawText(line, {
          x: margin,
          y: y - fontSize,
          size: fontSize,
          font: timesRoman,
          color: rgb(0.12, 0.12, 0.12),
        });
        y -= lineHeight;
      }
      y -= 4; // paragraph spacing
    }
  }

  const pdfBytes = await pdfDoc.save();
  const docsDir = path.resolve(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const outputPath = path.join(docsDir, 'founder-memo.pdf');
  fs.writeFileSync(outputPath, pdfBytes);
  console.log('Founder Memo PDF successfully generated at:', outputPath);
}

generateMemoPdf().catch((err) => {
  console.error('Failed to generate PDF:', err);
  process.exit(1);
});
