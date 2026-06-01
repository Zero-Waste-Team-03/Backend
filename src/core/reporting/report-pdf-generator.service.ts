import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { ReportingService } from './reporting.service';

const MARGIN = 28.35;
const ROW_HEIGHT = 22;
const HEADER_HEIGHT = 26;
const FONT_SIZE_BODY = 8;
const FONT_SIZE_HEADER = 9;
const FONT_SIZE_TITLE = 16;
const FONT_SIZE_META = 9;
const GRAY_HEADER = '#e8e8e8';
const GRAY_ALT_ROW = '#f7f7f7';
const COLOR_ACCENT = '#2d6a4f';

type TableColumn = { label: string; width: number };

/**
 * Generates PDF export buffers for admin report datasets.
 * Supports `reports` and `dangerous-donations` datasets.
 */
@Injectable()
export class ReportPdfGeneratorService {
  private readonly logger = new Logger(ReportPdfGeneratorService.name);

  constructor(private readonly reportingService: ReportingService) {}

  /**
   * Generates a PDF for the `reports` dataset.
   *
   * @returns Buffer containing the PDF bytes
   */
  async generateReportsPdf(): Promise<Buffer> {
    this.logger.log('Generating reports PDF export');
    const rows = await this.reportingService.getReportsForExport();

    const columns: TableColumn[] = [
      { label: 'ID', width: 80 },
      { label: 'Target Type', width: 70 },
      { label: 'Target ID', width: 80 },
      { label: 'Reporter ID', width: 80 },
      { label: 'Reason', width: 120 },
      { label: 'Status', width: 70 },
      { label: 'Reviewed At', width: 90 },
      { label: 'Created At', width: 90 },
    ];

    const tableData = rows.map((r) => [
      this.shortId(r.id),
      r.targetType,
      this.shortId(r.targetId),
      this.shortId(r.reporterId),
      this.truncate(r.reason, 22),
      r.status,
      r.reviewedAt ? this.formatDate(r.reviewedAt) : '—',
      this.formatDate(r.createdAt),
    ]);

    return this.buildPdf('Reports Export', columns, tableData, 'landscape');
  }

  /**
   * Generates a PDF for the `dangerous-donations` dataset.
   *
   * @returns Buffer containing the PDF bytes
   */
  async generateDangerousDonationsPdf(): Promise<Buffer> {
    this.logger.log('Generating dangerous-donations PDF export');
    const rows = await this.reportingService.getDangerousDonationsForExport();

    const columns: TableColumn[] = [
      { label: 'Donation ID', width: 80 },
      { label: 'Title', width: 130 },
      { label: 'Category', width: 90 },
      { label: 'Sensitivity', width: 70 },
      { label: 'Reports', width: 50 },
      { label: 'Safety OK', width: 55 },
      { label: 'Risk Score', width: 60 },
      { label: 'Last Reported', width: 90 },
    ];

    const tableData = rows.map((r) => [
      this.shortId(r.donationId),
      this.truncate(r.title, 24),
      this.truncate(r.categoryName, 16),
      r.categorySensitivity,
      String(r.reportCount),
      r.safetyChecklistCompleted ? 'Yes' : 'No',
      String(r.riskScore),
      r.lastReportedAt ? this.formatDate(new Date(r.lastReportedAt)) : '—',
    ]);

    return this.buildPdf(
      'Dangerous Donations Export',
      columns,
      tableData,
      'landscape',
    );
  }

  private buildPdf(
    title: string,
    columns: TableColumn[],
    rows: string[][],
    orientation: 'portrait' | 'landscape',
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: orientation,
        margins: {
          top: MARGIN,
          bottom: MARGIN,
          left: MARGIN,
          right: MARGIN,
        },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.drawHeader(doc, title);
      this.drawTable(doc, columns, rows);
      this.drawFooter(doc);

      doc.end();
    });
  }

  private drawHeader(doc: PDFKit.PDFDocument, title: string): void {
    const pageWidth = doc.page.width;

    doc.rect(0, 0, pageWidth, 55).fill(COLOR_ACCENT);

    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(FONT_SIZE_TITLE)
      .text('Zero Waste', MARGIN, 12, { continued: true })
      .font('Helvetica')
      .text(` — ${title}`);

    doc
      .fillColor('#cccccc')
      .font('Helvetica')
      .fontSize(FONT_SIZE_META)
      .text(`Exported: ${new Date().toUTCString()}`, MARGIN, 35);

    doc.fillColor('#000000').moveDown(0.5);
    doc.y = 70;
  }

  private drawTable(
    doc: PDFKit.PDFDocument,
    columns: TableColumn[],
    rows: string[][],
  ): void {
    const _pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const tableLeft = MARGIN;
    const tableWidth = columns.reduce((sum, c) => sum + c.width, 0);
    const rightEdge = tableLeft + tableWidth;

    const drawHeaderRow = (y: number) => {
      doc
        .rect(tableLeft, y, tableWidth, HEADER_HEIGHT)
        .fillAndStroke(GRAY_HEADER, '#999999')
        .fillColor('#000000');

      let x = tableLeft;
      for (const col of columns) {
        doc
          .font('Helvetica-Bold')
          .fontSize(FONT_SIZE_HEADER)
          .text(col.label, x + 4, y + 8, {
            width: col.width - 8,
            lineBreak: false,
          });
        x += col.width;
      }
    };

    let y = doc.y;
    drawHeaderRow(y);
    y += HEADER_HEIGHT;

    for (let i = 0; i < rows.length; i++) {
      if (y + ROW_HEIGHT > pageHeight - MARGIN - 20) {
        doc.addPage();
        this.drawHeader(doc, '');
        y = doc.y;
        drawHeaderRow(y);
        y += HEADER_HEIGHT;
      }

      const isAlt = i % 2 === 1;
      doc
        .rect(tableLeft, y, tableWidth, ROW_HEIGHT)
        .fillAndStroke(isAlt ? GRAY_ALT_ROW : '#ffffff', '#dddddd')
        .fillColor('#000000');

      let x = tableLeft;
      const row = rows[i];
      for (let j = 0; j < columns.length; j++) {
        doc
          .font('Helvetica')
          .fontSize(FONT_SIZE_BODY)
          .text(row[j] ?? '', x + 4, y + 7, {
            width: columns[j].width - 8,
            lineBreak: false,
          });

        if (j < columns.length - 1) {
          doc
            .moveTo(x + columns[j].width, y)
            .lineTo(x + columns[j].width, y + ROW_HEIGHT)
            .lineWidth(0.5)
            .stroke('#dddddd');
        }

        x += columns[j].width;
      }

      y += ROW_HEIGHT;
    }

    doc
      .moveTo(tableLeft, y)
      .lineTo(rightEdge, y)
      .lineWidth(1)
      .stroke('#999999');

    doc
      .font('Helvetica-Oblique')
      .fontSize(FONT_SIZE_META)
      .fillColor('#666666')
      .text(`Total records: ${rows.length}`, tableLeft, y + 6);
  }

  private drawFooter(doc: PDFKit.PDFDocument): void {
    const range = doc.bufferedPageRange();
    const total = range.count;

    for (let i = 0; i < total; i++) {
      doc.switchToPage(range.start + i);

      const pageWidth = doc.page.width;
      const footerY = doc.page.height - MARGIN + 5;

      doc
        .moveTo(MARGIN, footerY - 8)
        .lineTo(pageWidth - MARGIN, footerY - 8)
        .lineWidth(0.5)
        .stroke('#cccccc');

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#999999')
        .text(`Zero Waste — Confidential admin export`, MARGIN, footerY, {
          continued: true,
          width: pageWidth - MARGIN * 2 - 60,
        })
        .text(`Page ${i + 1} / ${total}`, { align: 'right' });
    }
  }

  private shortId(id: string): string {
    if (!id) return '—';
    return id.length > 13 ? `${id.substring(0, 8)}…` : id;
  }

  private truncate(text: string | null | undefined, max: number): string {
    if (!text) return '—';
    return text.length > max ? `${text.substring(0, max)}…` : text;
  }

  private formatDate(date: Date): string {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  }
}
