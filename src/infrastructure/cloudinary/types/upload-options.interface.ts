export type UploadType = 'USER_PROFILE' | 'POST' | 'OTHER';

export interface UploadingOptions {
  uploadType: UploadType;
}

export const UploadTypeValues = ['USER_PROFILE', 'POST', 'OTHER'];
