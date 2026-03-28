import { registerAs } from '@nestjs/config';

export default registerAs('firebase', () => {
  return {
    projectId: (process.env.FIREBASE_PROJECT_ID || '').trim(),
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '')
      .replace(/\\n/g, '\n')
      .replace(/^"+|"+$/g, '')
      .trim(),
    clientEmail: (process.env.FIREBASE_CLIENT_EMAIL || '').trim(),
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH || '',
  };
});
