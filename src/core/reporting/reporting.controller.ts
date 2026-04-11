import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AccessTokenGuard } from '../authentication/guards/access-token.guard';
import { RolesGuard } from '../authentication/guards/roles.guard';
import { Roles } from '../authentication/decorators/roles.decorator';
import { UserRoleValues } from '../user/entities/user.entity';
import { ReportingService } from './reporting.service';
import { throwAppError } from 'src/common/errors';

type ExportDataset = 'reports' | 'dangerous-donations';

@Controller('admin/exports')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRoleValues.ADMINISTRATOR)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

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
