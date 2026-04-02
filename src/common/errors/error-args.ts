/**
 * Maps error codes that require arguments to their expected arg shapes.
 * Only codes with runtime interpolation args need an entry here.
 * Codes without an entry accept no args.
 */
export interface ErrorArgsMap {
  'donation.not_found': { id: string };
  'upload.max_files_exceeded': { max: number };
  'upload.attachment_not_found': { id: string };
  'upload.attachments_not_found': { ids: string[] };
  'upload.failed_attachment': { id: string };
}
