/**
 * Maps error codes that require arguments to their expected arg shapes.
 * Only codes with runtime interpolation args need an entry here.
 * Codes without an entry accept no args.
 */
export interface ErrorArgsMap {
  'donation.not_found': { id: string };
  'donation.main_attachment_invalid': {
    mainAttachmentId?: string;
    attachmentIds?: string[];
  };
  'donation.attachment_ids_duplicated': { attachmentIds: string[] };
  'donation.location_xor_invalid': { locationId: string };
  'donation.not_available': { id: string; status: string };
  'donation.capacity_exceeded': {
    id: string;
    requestedQuantity: number;
    remainingQuantity: number;
  };
  'donation.like_target_invalid': { id: string };
  'upload.max_files_exceeded': { max: number };
  'upload.attachment_not_found': { id: string };
  'upload.attachments_not_found': { ids: string[] };
  'upload.failed_attachment': { id: string };
  'category.not_found': { id: string };
  'reservation.not_found': { id: string; status: string };
  'reservation.status_invalid': { status: string };
  'reservation.quantity_invalid': { quantity: number };
  'reservation.already_active': { donationId: string; beneficiaryId: string };
  'chat.conversation_not_found': { id: string };
  'chat.message_not_found': { id: string };
  'chat.message_read_only': { status: string };
  'chat.invalid_approval': { id: string };
  'badge.not_found': { id: string };
  'report.not_found': { id: string };
  'report.duplicate_open': { targetType: string; targetId: string };
  'report.status_invalid': { status: string };
  'report.export_dataset_invalid': { dataset: string };
  'auth.account_locked': { remainingSeconds: number };
}
