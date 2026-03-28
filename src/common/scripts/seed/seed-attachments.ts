import dataSource from 'src/infrastructure/db/data-source';
import {
  Attachment,
  UploadStatusValues,
} from 'src/common/modules/attachment/entities/attachment.entity';
import { User } from 'src/core/user/entities/user.entity';

type SeedAttachment = {
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  uploadStatus: Attachment['uploadStatus'];
  /** email of the user who owns this attachment (must already be seeded) */
  uploaderEmail: string;
};

const BASE_ATTACHMENTS: SeedAttachment[] = [
  {
    fileName: 'admin-avatar.jpg',
    fileType: 'image/jpeg',
    fileSize: 102_400,
    url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    uploadStatus: UploadStatusValues.COMPLETED,
    uploaderEmail: 'admin@gaspzero.local',
  },
  {
    fileName: 'user-profile-photo.png',
    fileType: 'image/png',
    fileSize: 204_800,
    url: 'https://res.cloudinary.com/demo/image/upload/profile.png',
    uploadStatus: UploadStatusValues.COMPLETED,
    uploaderEmail: 'user@gaspzero.local',
  },
  {
    fileName: 'org-banner.webp',
    fileType: 'image/webp',
    fileSize: 512_000,
    url: 'https://res.cloudinary.com/demo/image/upload/banner.webp',
    uploadStatus: UploadStatusValues.COMPLETED,
    uploaderEmail: 'organization@gaspzero.local',
  },
  {
    fileName: 'pending-upload-doc.pdf',
    fileType: 'application/pdf',
    fileSize: 1_048_576,
    url: '',
    uploadStatus: UploadStatusValues.PENDING,
    uploaderEmail: 'user@gaspzero.local',
  },
  {
    fileName: 'failed-upload-image.jpg',
    fileType: 'image/jpeg',
    fileSize: 300_000,
    url: '',
    uploadStatus: UploadStatusValues.FAILED,
    uploaderEmail: 'admin@gaspzero.local',
  },
];

function generateRandomAttachments(count: number): SeedAttachment[] {
  const uploaders = [
    'admin@gaspzero.local',
    'user@gaspzero.local',
    'organization@gaspzero.local',
  ];
  const types: Array<{ ext: string; mime: string }> = [
    { ext: 'jpg', mime: 'image/jpeg' },
    { ext: 'png', mime: 'image/png' },
    { ext: 'pdf', mime: 'application/pdf' },
    { ext: 'mp4', mime: 'video/mp4' },
  ];

  return Array.from({ length: count }, (_, i) => {
    const t = types[i % types.length];
    return {
      fileName: `generated-file-${i + 1}.${t.ext}`,
      fileType: t.mime,
      fileSize: Math.floor(Math.random() * 5_000_000) + 50_000,
      url: `https://res.cloudinary.com/demo/image/upload/gen-${i + 1}.${t.ext}`,
      uploadStatus: UploadStatusValues.COMPLETED,
      uploaderEmail: uploaders[i % uploaders.length],
    };
  });
}

const ATTACHMENTS_TO_SEED: SeedAttachment[] = [
  ...BASE_ATTACHMENTS,
  ...generateRandomAttachments(20),
];

async function upsertAttachment(seed: SeedAttachment): Promise<void> {
  const attachmentRepo = dataSource.getRepository(Attachment);
  const userRepo = dataSource.getRepository(User);

  const uploader = await userRepo.findOne({
    where: { email: seed.uploaderEmail },
  });

  if (!uploader) {
    process.stderr.write(
      `[seed-attachments] Skipping "${seed.fileName}": user "${seed.uploaderEmail}" not found. Run seed-users first.\n`,
    );
    return;
  }

  const existing = await attachmentRepo.findOne({
    where: { fileName: seed.fileName, uploadedById: uploader.id },
  });

  if (existing) {
    attachmentRepo.merge(existing, {
      fileType: seed.fileType,
      fileSize: seed.fileSize,
      url: seed.url,
      uploadStatus: seed.uploadStatus,
    });
    await attachmentRepo.save(existing);
    return;
  }

  const attachment = attachmentRepo.create({
    fileName: seed.fileName,
    fileType: seed.fileType,
    fileSize: seed.fileSize,
    url: seed.url,
    uploadStatus: seed.uploadStatus,
    uploadedById: uploader.id,
  });

  await attachmentRepo.save(attachment);
}

async function seedAttachments(): Promise<void> {
  await dataSource.initialize();

  try {
    for (const attachment of ATTACHMENTS_TO_SEED) {
      await upsertAttachment(attachment);
    }
  } finally {
    await dataSource.destroy();
  }
}

seedAttachments()
  .then(() => {
    process.stdout.write('Attachment seeding completed successfully.\n');
  })
  .catch((error: unknown) => {
    process.stderr.write(`Attachment seeding failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
