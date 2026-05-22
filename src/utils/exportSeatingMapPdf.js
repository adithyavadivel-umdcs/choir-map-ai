import { jsPDF } from 'jspdf';

const PT_TO_MM = 0.352778;

// Voice part fill/text/border colors matching the app's Tailwind palette
const PART_STYLE = {
  Soprano: { fill: [252, 231, 243], text: [157,  23,  77], border: [244, 114, 182] },
  Alto:    { fill: [255, 237, 213], text: [154,  52,  18], border: [251, 146,  60] },
  Tenor:   { fill: [224, 242, 254], text: [  3, 105, 161], border: [ 56, 189, 248] },
  Bass:    { fill: [209, 250, 229], text: [  6,  95,  70], border: [ 52, 211, 153] },
};
const DEFAULT_STYLE = { fill: [241, 245, 249], text: [51, 65, 85], border: [203, 213, 225] };

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Map row index → readable label regardless of how many rows there are
function rowLabel(idx, total) {
  if (total <= 1) return 'Front';
  if (idx === 0) return 'Front';
  if (idx === total - 1) return 'Back';
  return 'Middle';
}

// Binary-search truncation — font must be set before calling
function truncate(doc, text, maxWidth) {
  if (!text) return '';
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let lo = 0, hi = text.length;
  while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2);
    doc.getTextWidth(text.slice(0, mid) + '…') <= maxWidth ? (lo = mid) : (hi = mid);
  }
  return text.slice(0, lo) + '…';
}

// Line height in mm (1 em = fontSize pts × PT_TO_MM, × spacing factor)
function lineH(fontSize, spacing = 1.38) {
  return fontSize * PT_TO_MM * spacing;
}

export function exportSeatingMapPdf(chart, choirName) {
  if (!chart || chart.length === 0) return;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });

  const pageW = doc.internal.pageSize.getWidth();   // 297 mm
  const pageH = doc.internal.pageSize.getHeight();  // 210 mm
  const margin = 12;
  const usableW = pageW - margin * 2;               // 273 mm
  const usableH = pageH - margin * 2;               // 186 mm

  const numRows   = chart.length;
  const maxPerRow = Math.max(...chart.map((r) => r.singers.length), 1);

  // Fixed layout constants (mm)
  const HEADER_H     = 16;
  const STAGE_H      = 8;
  const AUDIENCE_H   = 8;
  const ROW_LABEL_W  = 17;
  const ROW_GAP      = 2;
  const CARD_GAP     = 1.5;

  const rowAreaH  = usableH - HEADER_H - STAGE_H - AUDIENCE_H;   // ~154 mm
  const cardAreaW = usableW - ROW_LABEL_W;                         // ~256 mm

  const cardH = Math.max(8, (rowAreaH - ROW_GAP * Math.max(numRows - 1, 0)) / numRows);
  const cardW = Math.max(10, (cardAreaW - CARD_GAP * Math.max(maxPerRow - 1, 0)) / maxPerRow);

  // Scale font sizes proportionally to card dimensions
  const nameFontSize   = Math.min(8,   Math.max(4.5, cardH * 0.21));
  const detailFontSize = Math.min(6.5, Math.max(4,   cardH * 0.16));
  const labelFontSize  = Math.min(6.5, Math.max(5,   cardH * 0.14));

  // Show optional fields only if card is tall enough to be readable
  const showHeight = (singer) => singer.heightCm && cardH >= 12;
  const showNotes  = (singer) => singer.notes    && cardH >= 17;

  // ── HEADER ───────────────────────────────────────────────────────────────
  let y = margin;
  const x = margin;

  // Choir name (left)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 135);
  doc.text(choirName, x, y + 5.5);

  // Title (center)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(25, 25, 55);
  doc.text('Seating Map', pageW / 2, y + 5.5, { align: 'center' });

  // Date (right)
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 135);
  doc.text(dateStr, x + usableW, y + 5.5, { align: 'right' });

  // Divider
  y += 8.5;
  doc.setDrawColor(210, 210, 228);
  doc.setLineWidth(0.3);
  doc.line(x, y, x + usableW, y);
  y += 1.5;

  // ── STAGE LABEL ──────────────────────────────────────────────────────────
  // Baseline of the label text, centered in the STAGE_H zone
  const stageMidY = y + STAGE_H / 2;
  const stageLabelBaseline = stageMidY + 7 * PT_TO_MM * 0.35; // approx visual center
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(109, 40, 217);
  doc.text('▲  STAGE / FRONT', pageW / 2, stageLabelBaseline, { align: 'center' });
  y += STAGE_H;

  // ── ROWS ─────────────────────────────────────────────────────────────────
  for (let rowIdx = 0; rowIdx < numRows; rowIdx++) {
    const row    = chart[rowIdx];
    const rowY   = y + rowIdx * (cardH + ROW_GAP);
    const singers = row.singers ?? [];

    // Row label — vertically centered in the card row
    const lblBaseline = rowY + cardH / 2 + labelFontSize * PT_TO_MM * 0.35;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(labelFontSize);
    doc.setTextColor(130, 130, 155);
    doc.text(rowLabel(rowIdx, numRows), x + ROW_LABEL_W - 2, lblBaseline, { align: 'right' });

    // Center this row's cards horizontally in the card area
    const nSingers  = singers.length;
    const rowCardsW = nSingers * cardW + Math.max(nSingers - 1, 0) * CARD_GAP;
    const cardsX    = x + ROW_LABEL_W + (cardAreaW - rowCardsW) / 2;

    for (let si = 0; si < nSingers; si++) {
      const singer = singers[si];
      const style  = PART_STYLE[singer.voicePart] ?? DEFAULT_STYLE;
      const cardX  = cardsX + si * (cardW + CARD_GAP);
      const textX  = cardX + cardW / 2;
      const maxTW  = cardW - 2.5; // horizontal text padding

      // Card background + border
      doc.setFillColor(...style.fill);
      doc.setDrawColor(...style.border);
      doc.setLineWidth(0.3);
      doc.roundedRect(cardX, rowY, cardW, cardH, 1.5, 1.5, 'FD');

      // Build content lines for this card
      const lines = [
        { text: singer.name,      bold: true,  size: nameFontSize,   color: style.text },
        { text: singer.voicePart, bold: false, size: detailFontSize, color: style.text },
      ];
      if (showHeight(singer)) {
        lines.push({ text: `${singer.heightCm} cm`, bold: false, size: detailFontSize, color: [130, 130, 155] });
      }
      if (showNotes(singer)) {
        lines.push({ text: singer.notes, bold: false, size: detailFontSize, color: [130, 130, 155] });
      }

      // Compute total text block height so we can vertically center it
      const blockH = lines.reduce((sum, l) => sum + lineH(l.size), 0);
      const topOfBlock = rowY + (cardH - blockH) / 2;

      // Draw each line; baseline = top of block + ascender of first line
      let textY = topOfBlock + lines[0].size * PT_TO_MM * 0.75;

      for (const line of lines) {
        doc.setFont('helvetica', line.bold ? 'bold' : 'normal');
        doc.setFontSize(line.size);
        doc.setTextColor(...line.color);
        doc.text(truncate(doc, line.text, maxTW), textX, textY, { align: 'center' });
        textY += lineH(line.size);
      }
    }
  }

  // ── AUDIENCE LABEL ───────────────────────────────────────────────────────
  const audienceTopY  = y + numRows * cardH + Math.max(numRows - 1, 0) * ROW_GAP;
  const audMidY       = audienceTopY + AUDIENCE_H / 2;
  const audBaseline   = audMidY + 7 * PT_TO_MM * 0.35;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 145);
  doc.text('▼  AUDIENCE', pageW / 2, audBaseline, { align: 'center' });

  // ── FOOTER ───────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(160, 160, 180);
  doc.text(`${choirName} · Generated ${dateStr}`, x, pageH - 5);
  doc.text('Choir Map AI', x + usableW, pageH - 5, { align: 'right' });

  doc.save(`${slugify(choirName || 'choir')}-seating-map.pdf`);
}
