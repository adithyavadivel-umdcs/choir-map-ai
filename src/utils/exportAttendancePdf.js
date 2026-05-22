import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const STATUS_LABELS = {
  present: 'Present',
  absent:  'Absent',
  late:    'Late',
  excused: 'Excused',
};

const STATUS_COLORS = {
  present: [5, 150, 105],
  absent:  [220, 38, 38],
  late:    [217, 119, 6],
  excused: [14, 116, 144],
};

const PART_ORDER = ['Soprano', 'Alto', 'Tenor', 'Bass'];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function countStatuses(records) {
  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const r of Object.values(records ?? {})) {
    if (r.status in counts) counts[r.status]++;
  }
  return counts;
}

function sortedRecords(records) {
  return Object.values(records ?? {}).sort((a, b) => {
    const pi = PART_ORDER.indexOf(a.singerVoicePart);
    const pj = PART_ORDER.indexOf(b.singerVoicePart);
    if (pi !== pj) return pi - pj;
    return a.singerName.localeCompare(b.singerName);
  });
}

function addSessionToPdf(doc, session, choirName, startY = 20) {
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = startY;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 60);
  doc.text('Attendance Report', margin, y);
  y += 7;

  // Choir name
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 120);
  doc.text(choirName, margin, y);
  y += 10;

  // Divider
  doc.setDrawColor(200, 200, 220);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Event info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 30, 60);
  doc.text(session.eventName, margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 120);
  const metaParts = [session.eventType, formatDate(session.date)].filter(Boolean);
  doc.text(metaParts.join('  ·  '), margin, y);
  y += 5;

  if (session.notes) {
    doc.setTextColor(130, 130, 150);
    doc.text(session.notes, margin, y);
    y += 5;
  }
  y += 4;

  // Summary table
  const counts = countStatuses(session.records);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Present', 'Absent', 'Late', 'Excused', 'Total']],
    body: [[
      counts.present,
      counts.absent,
      counts.late,
      counts.excused,
      Object.values(counts).reduce((a, b) => a + b, 0),
    ]],
    headStyles: {
      fillColor: [109, 40, 217],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: { halign: 'center', fontSize: 10, fontStyle: 'bold' },
    columnStyles: {
      0: { textColor: STATUS_COLORS.present },
      1: { textColor: STATUS_COLORS.absent },
      2: { textColor: STATUS_COLORS.late },
      3: { textColor: STATUS_COLORS.excused },
      4: { textColor: [30, 30, 60] },
    },
    theme: 'grid',
  });
  y = doc.lastAutoTable.finalY + 8;

  // Singer table
  const records = sortedRecords(session.records);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Name', 'Voice Part', 'Status']],
    body: records.map((r) => [r.singerName, r.singerVoicePart, STATUS_LABELS[r.status] ?? r.status]),
    headStyles: {
      fillColor: [226, 232, 240],
      textColor: [51, 65, 85],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 36 },
      2: { cellWidth: 28 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const status = records[data.row.index]?.status;
        if (STATUS_COLORS[status]) {
          data.cell.styles.textColor = STATUS_COLORS[status];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: 'striped',
  });

  return doc.lastAutoTable.finalY;
}

function addFooters(doc, choirName) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const generated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 180);
    doc.text(`${choirName} · Generated ${generated}`, 14, pageHeight - 8);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
  }
}

export function exportSingleSessionPdf(session, choirName) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  addSessionToPdf(doc, session, choirName, 20);
  addFooters(doc, choirName);

  const dateSlug = session.date ?? 'undated';
  const nameSlug = slugify(choirName || 'choir');
  doc.save(`${nameSlug}-attendance-${dateSlug}.pdf`);
}

export function exportAllSessionsPdf(sessions, choirName) {
  if (!sessions || sessions.length === 0) return;

  const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  sorted.forEach((session, index) => {
    if (index > 0) doc.addPage();
    addSessionToPdf(doc, session, choirName, 20);
  });

  addFooters(doc, choirName);

  const nameSlug = slugify(choirName || 'choir');
  const today = new Date().toISOString().split('T')[0];
  doc.save(`${nameSlug}-attendance-all-${today}.pdf`);
}
