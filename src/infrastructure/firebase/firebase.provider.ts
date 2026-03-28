import { Provider } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FIREBASE_OPTIONS } from './firebase.constants';
import { FirebaseOptions } from './firebase.interface';

export const FirebaseProvider: Provider = {
  provide: 'FIREBASE_APP',
  useFactory: (options: FirebaseOptions) => {
    if (options.serviceAccountPath) {
      return admin.initializeApp({
        credential: admin.credential.cert(options.serviceAccountPath),
      });
    }

    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: options.projectId,
        clientEmail: options.clientEmail,
        privateKey: options.privateKey,
      }),
    });
  },
  inject: [FIREBASE_OPTIONS],
};
