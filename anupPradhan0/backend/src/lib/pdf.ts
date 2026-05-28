import PDFDocument from 'pdfkit';
import { Writable } from 'stream';

export interface EventForPdf {
  name: string;
  datetime: Date;
  number: number;
  location: string;
}

export interface DateRange {
  from?: Date;
  to?: Date;
}

interface BuildOpts {
  ownerEmail: string;
  ownerName?: string;
  events: EventForPdf[];
  range?: DateRange;
  sink: Writable;
}

const COLOR = {
  ink: '#0F172A',
  body: '#1E3A5F',
  accent: '#2563EB',
  muted: '#64748B',
  faint: '#CBD5E1',
  rule: '#E2E8F0',
  paper: '#FFFFFF',
  tint: '#F8FAFC',
};

const FONT = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
};

const PAGE_MARGIN = 56;
const HEADER_BAND = 32;
const FOOTER_BAND = 32;
const ROW_HEIGHT = 56;
const ROW_GAP = 6;
const SECTION_HEADER = 40;

function fmtDayHeader(d: Date): string {
  return d
    .toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    .toUpperCase();
}

function fmtTime(d: Date): string {
  return d.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function fmtGeneratedDate(d: Date): string {
  return d.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtNumber(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString('en-US');
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

interface PageContext {
  doc: PDFKit.PDFDocument;
  width: number;
  height: number;
  contentWidth: number;
  contentLeft: number;
  contentRight: number;
  contentTop: number;
  contentBottom: number;
  ownerEmail: string;
}

interface DaySection {
  date: Date;
  events: EventForPdf[];
}

function groupByDay(events: EventForPdf[]): DaySection[] {
  const map = new Map<string, DaySection>();
  for (const e of events) {
    const k = dayKey(e.datetime);
    const existing = map.get(k);
    if (existing) existing.events.push(e);
    else map.set(k, { date: e.datetime, events: [e] });
  }
  return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

function drawBrand(doc: PDFKit.PDFDocument, x: number, y: number) {
  doc.save();
  doc.rect(x, y, 7, 7).fillColor(COLOR.accent).fill();
  doc
    .font(FONT.bold)
    .fontSize(8)
    .fillColor(COLOR.ink)
    .text('APERTURE', x + 12, y - 0.5, { lineBreak: false, characterSpacing: 1.5 });
  doc.restore();
}

function drawTopBand(ctx: PageContext, rightText: string) {
  const { doc, contentLeft, contentRight } = ctx;
  drawBrand(doc, contentLeft, PAGE_MARGIN);
  doc
    .font(FONT.regular)
    .fontSize(8)
    .fillColor(COLOR.muted);
  const w = doc.widthOfString(rightText);
  doc.text(rightText, contentRight - w, PAGE_MARGIN, {
    lineBreak: false,
    characterSpacing: 1.2,
  });
  doc
    .moveTo(contentLeft, PAGE_MARGIN + HEADER_BAND - 8)
    .lineTo(contentRight, PAGE_MARGIN + HEADER_BAND - 8)
    .lineWidth(0.5)
    .strokeColor(COLOR.rule)
    .stroke();
}

function drawBottomBand(ctx: PageContext, pageNumber: number, pageCount: number) {
  const { doc, contentLeft, contentRight, contentBottom, ownerEmail } = ctx;
  doc
    .moveTo(contentLeft, contentBottom + 8)
    .lineTo(contentRight, contentBottom + 8)
    .lineWidth(0.5)
    .strokeColor(COLOR.rule)
    .stroke();

  doc.font(FONT.regular).fontSize(8).fillColor(COLOR.muted);
  doc.text(ownerEmail, contentLeft, contentBottom + 16, { lineBreak: false });

  const pageLabel = `${String(pageNumber).padStart(2, '0')} / ${String(pageCount).padStart(2, '0')}`;
  const w = doc.widthOfString(pageLabel);
  doc.font(FONT.bold).fillColor(COLOR.ink);
  doc.text(pageLabel, contentRight - w, contentBottom + 16, {
    lineBreak: false,
    characterSpacing: 0.8,
  });
}

function fmtRange(range: DateRange | undefined, fallback: () => string): string {
  if (!range || (!range.from && !range.to)) return fallback();
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  if (range.from && range.to) {
    return `${range.from.toLocaleString('en-US', opts)} – ${range.to.toLocaleString('en-US', opts)}`;
  }
  if (range.from) return `From ${range.from.toLocaleString('en-US', opts)}`;
  return `Through ${range.to!.toLocaleString('en-US', opts)}`;
}

function drawCover(
  ctx: PageContext,
  opts: { ownerName?: string; events: EventForPdf[]; range?: DateRange }
) {
  const { doc, contentLeft, contentRight, contentTop, contentBottom, ownerEmail } = ctx;
  const eyebrow = `${new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()} · EVENTS`;
  drawTopBand(ctx, eyebrow);

  // Big title block — placed roughly at one-third down the page for balance
  const titleY = contentTop + 120;

  doc
    .font(FONT.regular)
    .fontSize(9)
    .fillColor(COLOR.muted)
    .text('A PRINTABLE LOG', contentLeft, titleY, {
      lineBreak: false,
      characterSpacing: 2,
    });

  doc
    .font(FONT.bold)
    .fontSize(64)
    .fillColor(COLOR.ink)
    .text('Your events.', contentLeft, titleY + 24, {
      lineBreak: false,
      characterSpacing: -1,
    });

  // Description
  const count = opts.events.length;
  const dayCount = groupByDay(opts.events).length;
  const eventWord = count === 1 ? 'event' : 'events';
  const dayWord = dayCount === 1 ? 'day' : 'days';
  const summary =
    count === 0
      ? 'No events scheduled yet.'
      : `${count} ${eventWord} across ${dayCount} ${dayWord}.`;

  doc
    .font(FONT.regular)
    .fontSize(13)
    .fillColor(COLOR.body)
    .text(summary, contentLeft, titleY + 116, { lineBreak: false });

  // Owner block
  const ownerY = titleY + 180;
  doc
    .font(FONT.regular)
    .fontSize(8)
    .fillColor(COLOR.muted)
    .text('PREPARED FOR', contentLeft, ownerY, { lineBreak: false, characterSpacing: 1.5 });

  doc
    .font(FONT.bold)
    .fontSize(14)
    .fillColor(COLOR.ink)
    .text(opts.ownerName || ownerEmail, contentLeft, ownerY + 14, { lineBreak: false });

  if (opts.ownerName) {
    doc
      .font(FONT.regular)
      .fontSize(11)
      .fillColor(COLOR.muted)
      .text(ownerEmail, contentLeft, ownerY + 34, { lineBreak: false });
  }

  // Right-aligned date / count column
  const rightColX = contentRight - 200;
  doc
    .font(FONT.regular)
    .fontSize(8)
    .fillColor(COLOR.muted)
    .text('GENERATED', rightColX, ownerY, { lineBreak: false, characterSpacing: 1.5 });
  doc
    .font(FONT.bold)
    .fontSize(14)
    .fillColor(COLOR.ink)
    .text(fmtGeneratedDate(new Date()), rightColX, ownerY + 14, { lineBreak: false });

  // Show selected range first (if any), otherwise the actual span of included events.
  const rangeStr = fmtRange(opts.range, () => {
    if (count === 0) return '—';
    const first = opts.events[0].datetime;
    const last = opts.events[count - 1].datetime;
    return dayKey(first) === dayKey(last)
      ? first.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : `${first.toLocaleString('en-US', { month: 'short', day: 'numeric' })} – ${last.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  });
  doc
    .font(FONT.regular)
    .fontSize(11)
    .fillColor(COLOR.muted)
    .text(rangeStr, rightColX, ownerY + 34, { lineBreak: false });

  // Bottom line of cover: small subtle text + corner mark
  doc
    .moveTo(contentLeft, contentBottom + 8)
    .lineTo(contentRight, contentBottom + 8)
    .lineWidth(0.5)
    .strokeColor(COLOR.rule)
    .stroke();

  doc
    .font(FONT.regular)
    .fontSize(8)
    .fillColor(COLOR.muted)
    .text('PAGE  COVER', contentLeft, contentBottom + 16, {
      lineBreak: false,
      characterSpacing: 1.5,
    });

  const totalLine = `${String(count).padStart(2, '0')} TOTAL`;
  doc.font(FONT.bold).fillColor(COLOR.ink);
  const tw = doc.widthOfString(totalLine);
  doc.text(totalLine, contentRight - tw, contentBottom + 16, {
    lineBreak: false,
    characterSpacing: 1.5,
  });
}

function drawSectionHeader(ctx: PageContext, date: Date, y: number): number {
  const { doc, contentLeft, contentRight } = ctx;
  doc
    .font(FONT.bold)
    .fontSize(9)
    .fillColor(COLOR.accent)
    .text(fmtDayHeader(date), contentLeft, y, {
      lineBreak: false,
      characterSpacing: 1.8,
    });
  doc
    .moveTo(contentLeft, y + 18)
    .lineTo(contentRight, y + 18)
    .lineWidth(0.75)
    .strokeColor(COLOR.ink)
    .stroke();
  return y + SECTION_HEADER;
}

function drawEventRow(
  ctx: PageContext,
  event: EventForPdf,
  globalIndex: number,
  y: number,
  isLast: boolean
): number {
  const { doc, contentLeft, contentRight, contentWidth } = ctx;

  const leftColW = 84;
  const rightColW = 80;
  const middleColX = contentLeft + leftColW + 8;
  const middleColW = contentWidth - leftColW - rightColW - 16;
  const rightColX = contentRight - rightColW;

  // Left column: time + event index
  doc
    .font(FONT.bold)
    .fontSize(16)
    .fillColor(COLOR.ink)
    .text(fmtTime(event.datetime), contentLeft, y, {
      width: leftColW,
      lineBreak: false,
    });
  doc
    .font(FONT.regular)
    .fontSize(8)
    .fillColor(COLOR.muted)
    .text(`EVENT ${String(globalIndex + 1).padStart(2, '0')}`, contentLeft, y + 24, {
      width: leftColW,
      lineBreak: false,
      characterSpacing: 1.2,
    });

  // Middle column: name + location
  doc
    .font(FONT.bold)
    .fontSize(14)
    .fillColor(COLOR.ink)
    .text(event.name, middleColX, y, {
      width: middleColW,
      lineBreak: false,
      ellipsis: true,
    });
  doc
    .font(FONT.regular)
    .fontSize(10)
    .fillColor(COLOR.muted)
    .text(event.location, middleColX, y + 22, {
      width: middleColW,
      lineBreak: false,
      ellipsis: true,
    });

  // Right column: number (large) + label below, both right-aligned
  doc
    .font(FONT.bold)
    .fontSize(20)
    .fillColor(COLOR.ink)
    .text(fmtNumber(event.number), rightColX, y + 2, {
      width: rightColW,
      lineBreak: false,
      align: 'right',
    });
  doc
    .font(FONT.regular)
    .fontSize(8)
    .fillColor(COLOR.muted)
    .text('NUMBER', rightColX, y + 28, {
      width: rightColW,
      lineBreak: false,
      align: 'right',
      characterSpacing: 1.2,
    });

  // Hairline under row (skip after the last row of a section/page)
  if (!isLast) {
    doc
      .moveTo(contentLeft, y + ROW_HEIGHT)
      .lineTo(contentRight, y + ROW_HEIGHT)
      .lineWidth(0.5)
      .strokeColor(COLOR.rule)
      .stroke();
  }

  return y + ROW_HEIGHT + ROW_GAP;
}

function drawEmptyState(ctx: PageContext) {
  const { doc, contentLeft, contentRight, contentTop, contentBottom } = ctx;
  const centerY = (contentTop + contentBottom) / 2;
  const centerX = (contentLeft + contentRight) / 2;
  doc
    .font(FONT.bold)
    .fontSize(24)
    .fillColor(COLOR.ink)
    .text('Nothing scheduled.', contentLeft, centerY - 24, {
      width: contentRight - contentLeft,
      align: 'center',
      lineBreak: false,
    });
  doc
    .font(FONT.regular)
    .fontSize(11)
    .fillColor(COLOR.muted)
    .text(
      'Add an event in the app, then export this document again.',
      contentLeft,
      centerY + 8,
      { width: contentRight - contentLeft, align: 'center', lineBreak: false }
    );
  // tiny accent mark
  doc.rect(centerX - 12, centerY + 36, 24, 1.5).fillColor(COLOR.accent).fill();
}

export function buildEventsPdf({
  ownerEmail,
  ownerName,
  events,
  range,
  sink,
}: BuildOpts): Promise<void> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: {
      top: PAGE_MARGIN,
      bottom: PAGE_MARGIN,
      left: PAGE_MARGIN,
      right: PAGE_MARGIN,
    },
    bufferPages: true,
    info: {
      Title: 'Events',
      Author: ownerName || ownerEmail,
      Creator: 'Aperture',
    },
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

  const ctx: PageContext = {
    doc,
    width: doc.page.width,
    height: doc.page.height,
    contentWidth: doc.page.width - PAGE_MARGIN * 2,
    contentLeft: PAGE_MARGIN,
    contentRight: doc.page.width - PAGE_MARGIN,
    contentTop: PAGE_MARGIN + HEADER_BAND,
    contentBottom: doc.page.height - PAGE_MARGIN - FOOTER_BAND,
    ownerEmail,
  };

  try {
    // Sort defensively, then group
    const sorted = [...events].sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

    // --- Cover page ---
    drawCover(ctx, { ownerName, events: sorted, range });

    if (sorted.length === 0) {
      // single page: empty state lives on its own page after the cover
      doc.addPage();
      const eyebrow = `EVENTS · ${ownerEmail.toUpperCase()}`;
      drawTopBand(ctx, eyebrow);
      drawEmptyState(ctx);
    } else {
      const sections = groupByDay(sorted);
      const eyebrow = `EVENTS · ${ownerEmail.toUpperCase()}`;

      doc.addPage();
      drawTopBand(ctx, eyebrow);
      let y = ctx.contentTop + 24;

      let globalIndex = 0;
      sections.forEach((section, sIdx) => {
        // ensure section header + at least one row fits
        const minNeeded = SECTION_HEADER + ROW_HEIGHT;
        if (y + minNeeded > ctx.contentBottom) {
          doc.addPage();
          drawTopBand(ctx, eyebrow);
          y = ctx.contentTop + 24;
        } else if (sIdx > 0) {
          y += 16; // breathing room between sections
        }

        y = drawSectionHeader(ctx, section.date, y);

        section.events.forEach((event, eIdx) => {
          // ensure row fits
          if (y + ROW_HEIGHT > ctx.contentBottom) {
            doc.addPage();
            drawTopBand(ctx, eyebrow);
            y = ctx.contentTop + 24;
            // repeat section header on continuation
            y = drawSectionHeader(ctx, section.date, y);
          }
          const isLastInSection = eIdx === section.events.length - 1;
          y = drawEventRow(ctx, event, globalIndex, y, isLastInSection);
          globalIndex += 1;
        });
      });
    }

    // --- Footer pass ---
    const pageRange = doc.bufferedPageRange();
    const total = pageRange.count;
    for (let i = 0; i < total; i++) {
      doc.switchToPage(pageRange.start + i);
      if (i === 0) {
        // cover has its own bottom band drawn already
        continue;
      }
      drawBottomBand(ctx, i, total - 1);
    }

    doc.end();
  } catch (err) {
    doc.emit('error', err instanceof Error ? err : new Error(String(err)));
    try {
      doc.end();
    } catch {
      // already finalised
    }
  }
  return lifecycle;
}
