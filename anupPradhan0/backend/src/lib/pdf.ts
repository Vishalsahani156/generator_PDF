import PDFDocument from 'pdfkit';
import { Writable } from 'stream';

export interface EventForPdf {
  name: string;
  datetime: Date;
  number: number;
  location: string;
}

interface BuildOpts {
  ownerEmail: string;
  ownerName?: string;
  events: EventForPdf[];
  sink: Writable;
}

const COLOR = {
  ink: '#1E3A5F',
  blue600: '#2563EB',
  blue700: '#1D4ED8',
  blue300: '#93C5FD',
  blue200: '#BFDBFE',
  blue50: '#EFF6FF',
  white: '#FFFFFF',
};

const PAGE_MARGIN = 48;
const TITLE_BLOCK_HEIGHT = 88;
const FOOTER_HEIGHT = 32;
const CARD_HEIGHT = 96;
const CARD_GAP = 12;

function fmtDate(d: Date): string {
  return d.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function drawTitleBlock(
  doc: PDFKit.PDFDocument,
  opts: { title: string; subtitle: string; x: number; y: number; width: number }
) {
  const { title, subtitle, x, y, width } = opts;
  doc
    .font('Helvetica-Bold')
    .fontSize(24)
    .fillColor(COLOR.ink)
    .text(title, x, y, { width });
  doc
    .font('Helvetica')
    .fontSize(11)
    .fillColor(COLOR.blue600)
    .text(subtitle, x, y + 32, { width });
  // Accent rule
  doc
    .moveTo(x, y + 64)
    .lineTo(x + width, y + 64)
    .lineWidth(1)
    .strokeColor(COLOR.blue200)
    .stroke();
}

function drawCard(
  doc: PDFKit.PDFDocument,
  event: EventForPdf,
  index: number,
  bounds: { x: number; y: number; width: number; height: number }
) {
  const { x, y, width, height } = bounds;

  // Background
  doc.save();
  doc.roundedRect(x, y, width, height, 8).fillColor(COLOR.blue50).fill();
  // Left accent stripe
  doc.rect(x, y, 4, height).fillColor(COLOR.blue600).fill();
  // Border
  doc
    .roundedRect(x, y, width, height, 8)
    .lineWidth(1)
    .strokeColor(COLOR.blue200)
    .stroke();
  doc.restore();

  const innerX = x + 20;
  const innerY = y + 14;
  const innerWidth = width - 28;

  // Index pill
  const pillText = `#${String(index + 1).padStart(2, '0')}`;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.blue600);
  const pillWidth = doc.widthOfString(pillText) + 12;
  doc.save();
  doc
    .roundedRect(innerX, innerY, pillWidth, 16, 4)
    .lineWidth(1)
    .strokeColor(COLOR.blue600)
    .stroke();
  doc.text(pillText, innerX + 6, innerY + 3.5, { lineBreak: false });
  doc.restore();

  // Title
  doc
    .font('Helvetica-Bold')
    .fontSize(14)
    .fillColor(COLOR.ink)
    .text(event.name, innerX + pillWidth + 8, innerY, {
      width: innerWidth - pillWidth - 8,
      ellipsis: true,
      lineBreak: false,
    });

  // Detail rows
  const detailY = innerY + 28;
  const colWidth = (innerWidth - 16) / 3;
  drawDetail(doc, 'When', fmtDate(event.datetime), innerX, detailY, colWidth);
  drawDetail(
    doc,
    'Number',
    String(event.number),
    innerX + colWidth + 8,
    detailY,
    colWidth
  );
  drawDetail(
    doc,
    'Location',
    event.location,
    innerX + (colWidth + 8) * 2,
    detailY,
    colWidth
  );
}

function drawDetail(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number
) {
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(COLOR.blue300)
    .text(label.toUpperCase(), x, y, { width, lineBreak: false });
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(COLOR.ink)
    .text(value, x, y + 12, { width, ellipsis: true, lineBreak: false });
}

function drawFooter(
  doc: PDFKit.PDFDocument,
  pageNumber: number,
  pageCount: number,
  ownerEmail: string
) {
  const y = doc.page.height - PAGE_MARGIN + 8;
  doc
    .moveTo(PAGE_MARGIN, y - 8)
    .lineTo(doc.page.width - PAGE_MARGIN, y - 8)
    .lineWidth(1)
    .strokeColor(COLOR.blue200)
    .stroke();

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(COLOR.blue300)
    .text(ownerEmail, PAGE_MARGIN, y, { lineBreak: false });

  const pageStr = `Page ${pageNumber} of ${pageCount}`;
  const w = doc.widthOfString(pageStr);
  doc.text(pageStr, doc.page.width - PAGE_MARGIN - w, y, { lineBreak: false });
}

export function buildEventsPdf({
  ownerEmail,
  ownerName,
  events,
  sink,
}: BuildOpts): Promise<void> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN },
    bufferPages: true,
  });

  const lifecycle = new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve();
    };
    doc.on('error', finish);
    sink.on('error', finish);
    sink.on('finish', () => finish());
    sink.on('close', () => finish());
  });

  doc.pipe(sink);

  try {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const contentWidth = pageWidth - PAGE_MARGIN * 2;

  // Available height for cards on the first page (after title block)
  const firstPageCardArea =
    pageHeight - PAGE_MARGIN * 2 - TITLE_BLOCK_HEIGHT - FOOTER_HEIGHT;
  // Available height for cards on subsequent pages (no title, just continuation header)
  const continuationHeader = 40;
  const nextPageCardArea =
    pageHeight - PAGE_MARGIN * 2 - continuationHeader - FOOTER_HEIGHT;

  const cardsFirstPage = Math.max(
    1,
    Math.floor((firstPageCardArea + CARD_GAP) / (CARD_HEIGHT + CARD_GAP))
  );
  const cardsNextPage = Math.max(
    1,
    Math.floor((nextPageCardArea + CARD_GAP) / (CARD_HEIGHT + CARD_GAP))
  );

  const chunks: EventForPdf[][] = [];
  if (events.length === 0) {
    chunks.push([]);
  } else {
    chunks.push(events.slice(0, cardsFirstPage));
    let i = cardsFirstPage;
    while (i < events.length) {
      chunks.push(events.slice(i, i + cardsNextPage));
      i += cardsNextPage;
    }
  }

  const subtitle = ownerName
    ? `${events.length} event${events.length === 1 ? '' : 's'} • ${ownerName} (${ownerEmail})`
    : `${events.length} event${events.length === 1 ? '' : 's'} • ${ownerEmail}`;

  let globalIndex = 0;
  chunks.forEach((chunk, pageIdx) => {
    if (pageIdx > 0) doc.addPage();

    let cursorY: number;
    if (pageIdx === 0) {
      drawTitleBlock(doc, {
        title: 'Events',
        subtitle,
        x: PAGE_MARGIN,
        y: PAGE_MARGIN,
        width: contentWidth,
      });
      cursorY = PAGE_MARGIN + TITLE_BLOCK_HEIGHT;
    } else {
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(COLOR.blue300)
        .text(`Events (continued) • ${ownerEmail}`, PAGE_MARGIN, PAGE_MARGIN, {
          width: contentWidth,
          lineBreak: false,
        });
      doc
        .moveTo(PAGE_MARGIN, PAGE_MARGIN + 20)
        .lineTo(PAGE_MARGIN + contentWidth, PAGE_MARGIN + 20)
        .lineWidth(1)
        .strokeColor(COLOR.blue200)
        .stroke();
      cursorY = PAGE_MARGIN + continuationHeader;
    }

    if (chunk.length === 0) {
      doc
        .font('Helvetica')
        .fontSize(12)
        .fillColor(COLOR.blue300)
        .text('No events yet.', PAGE_MARGIN, cursorY + 24, {
          width: contentWidth,
          align: 'center',
        });
    } else {
      chunk.forEach((event) => {
        drawCard(doc, event, globalIndex, {
          x: PAGE_MARGIN,
          y: cursorY,
          width: contentWidth,
          height: CARD_HEIGHT,
        });
        cursorY += CARD_HEIGHT + CARD_GAP;
        globalIndex += 1;
      });
    }
  });

  // Second pass: page X of Y footer
  const range = doc.bufferedPageRange();
  const total = range.count;
  for (let i = 0; i < total; i++) {
    doc.switchToPage(range.start + i);
    drawFooter(doc, i + 1, total, ownerEmail);
  }

  doc.end();
  } catch (err) {
    doc.emit('error', err instanceof Error ? err : new Error(String(err)));
    try {
      doc.end();
    } catch {
      // ignore — error already propagated through doc 'error' event
    }
  }
  return lifecycle;
}
