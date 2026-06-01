import { Controller, Get, Logger, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiProduces,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../authentication/guards/access-token.guard';
import { RolesGuard } from '../authentication/guards/roles.guard';
import { Roles } from '../authentication/decorators/roles.decorator';
import { UserRoleValues } from '../user/entities/user.entity';
import { ReportingService } from './reporting.service';
import { ReportPdfGeneratorService } from './report-pdf-generator.service';
import { throwAppError } from 'src/common/errors';

type ExportDataset = 'reports' | 'dangerous-donations';

@ApiTags('Admin Exports')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
@ApiForbiddenResponse({ description: 'Requires administrator role.' })
@Controller('admin/exports')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRoleValues.ADMINISTRATOR)
export class ReportingController {
  private readonly logger = new Logger(ReportingController.name);

  constructor(
    private readonly reportingService: ReportingService,
    private readonly reportPdfGeneratorService: ReportPdfGeneratorService,
  ) {}

  @ApiOperation({
    summary: 'Export report data as CSV',
    description:
      'Downloads a CSV file for the specified dataset. `reports` includes all submitted reports. `dangerous-donations` includes donations flagged by multiple users with computed risk scores.',
  })
  @ApiQuery({
    name: 'dataset',
    enum: ['reports', 'dangerous-donations'],
    description: 'The dataset to export.',
  })
  @ApiOkResponse({
    description: 'CSV file download.',
    content: { 'text/csv': { schema: { type: 'string', format: 'binary' } } },
  })
  @ApiBadRequestResponse({ description: 'Invalid or missing `dataset` query parameter.' })
  @ApiProduces('text/csv')
  @Get('csv')
  async exportCsv(
    @Query('dataset') dataset: ExportDataset,
    @Res() res: Response,
  ) {
    let csv = '';
    let filename = '';

    if (dataset === 'reports') {
      const rows = await this.reportingService.getReportsForExport();
      filename = 'reports.csv';
      csv = this.toCsv(
        [
          'id',
          'targetType',
          'targetId',
          'reporterId',
          'reason',
          'description',
          'status',
          'reviewedById',
          'reviewedAt',
          'createdAt',
        ],
        rows.map((row) => [
          row.id,
          row.targetType,
          row.targetId,
          row.reporterId,
          row.reason,
          row.description || '',
          row.status,
          row.reviewedById || '',
          row.reviewedAt ? row.reviewedAt.toISOString() : '',
          row.createdAt.toISOString(),
        ]),
      );
    } else if (dataset === 'dangerous-donations') {
      const rows = await this.reportingService.getDangerousDonationsForExport();
      filename = 'dangerous-donations.csv';
      csv = this.toCsv(
        [
          'donationId',
          'title',
          'categoryId',
          'categoryName',
          'categorySensitivity',
          'reportCount',
          'safetyChecklistCompleted',
          'riskScore',
          'lastReportedAt',
        ],
        rows.map((row) => [
          row.donationId,
          row.title,
          row.categoryId,
          row.categoryName,
          row.categorySensitivity,
          row.reportCount,
          row.safetyChecklistCompleted,
          row.riskScore,
          row.lastReportedAt ? new Date(row.lastReportedAt).toISOString() : '',
        ]),
      );
    } else {
      throwAppError('REPORT_EXPORT_DATASET_INVALID', {
        dataset: String(dataset),
      });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  }

  @ApiOperation({
    summary: 'Export report data as PDF',
    description:
      'Downloads a formatted A4 landscape PDF for the specified dataset. Includes a styled table with alternating rows, auto-pagination, and page numbers.',
  })
  @ApiQuery({
    name: 'dataset',
    enum: ['reports', 'dangerous-donations'],
    description: 'The dataset to export.',
  })
  @ApiOkResponse({
    description: 'PDF file download.',
    content: {
      'application/pdf': { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid or missing `dataset` query parameter.' })
  @ApiProduces('application/pdf')
  @Get('pdf')
  async exportPdf(
    @Query('dataset') dataset: ExportDataset,
    @Res() res: Response,
  ) {
    let pdfBuffer: Buffer;
    let filename: string;

    if (dataset === 'reports') {
      pdfBuffer = await this.reportPdfGeneratorService.generateReportsPdf();
      filename = 'reports.pdf';
    } else if (dataset === 'dangerous-donations') {
      pdfBuffer =
        await this.reportPdfGeneratorService.generateDangerousDonationsPdf();
      filename = 'dangerous-donations.pdf';
    } else {
      throwAppError('REPORT_EXPORT_DATASET_INVALID', {
        dataset: String(dataset),
      });
    }

    this.logger.log(`Exporting PDF for dataset: ${dataset}`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.status(200).send(pdfBuffer);
  }

  private toCsv(
    headers: string[],
    rows: Array<Array<string | number | boolean>>,
  ) {
    const headerLine = headers.join(',');
    const body = rows
      .map((row) => row.map((value) => this.escapeCsv(value)).join(','))
      .join('\n');
    return `${headerLine}\n${body}`;
  }

  private escapeCsv(value: string | number | boolean): string {
    const stringValue = String(value ?? '');
    if (
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n')
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }
}
