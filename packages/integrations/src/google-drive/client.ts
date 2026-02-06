import { google } from 'googleapis';
import type { drive_v3 } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

let driveClient: drive_v3.Drive | null = null;

export function getDriveClient(): drive_v3.Drive {
  if (driveClient) return driveClient;

  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (!keyPath) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_PATH is not set');
  }

  const resolvedPath = path.resolve(keyPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Service account key file not found: ${resolvedPath}`);
  }

  const keyFile = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));

  const auth = new google.auth.GoogleAuth({
    credentials: keyFile,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

export function getRootFolderId(): string {
  const id = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!id) {
    throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID is not set');
  }
  return id;
}
