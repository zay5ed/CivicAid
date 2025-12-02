import * as admin from 'firebase-admin';

// Initialize App
admin.initializeApp();

// Export Functions
export * from './analyze';
export * from './sms';