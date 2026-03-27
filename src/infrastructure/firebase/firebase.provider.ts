import { Provider } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FIREBASE_OPTIONS } from './firebase.constants';
import { FirebaseOptions } from './firebase.interface';

export const FirebaseProvider: Provider = {
  provide: 'FIREBASE_APP',
  useFactory: (options: FirebaseOptions) => {
    return admin.initializeApp({
      credential: admin.credential.cert({
        ...options,
      }),
    });
  },
  inject: [FIREBASE_OPTIONS],
};
