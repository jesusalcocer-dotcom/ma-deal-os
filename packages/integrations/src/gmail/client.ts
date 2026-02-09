import { google } from 'googleapis';
import type { gmail_v1 } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

let gmailClient: gmail_v1.Gmail | null = null;

interface OAuthClientJson {
  installed?: { client_id: string; client_secret: string; redirect_uris?: string[] };
  web?: { client_id: string; client_secret: string; redirect_uris?: string[] };
}

interface StoredToken {
  access_token?: string;
  refresh_token: string;
  token_type?: string;
  expiry_date?: number;
}

function readJsonFile<T>(filePath: string): T {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }
  return JSON.parse(fs.readFileSync(resolved, 'utf8')) as T;
}

function resolveOAuthCredentials(): { clientId: string; clientSecret: string; redirectUri: string } {
  const clientJsonPath = process.env.GOOGLE_OAUTH_CLIENT_JSON_PATH;
  if (!clientJsonPath) {
    throw new Error('GOOGLE_OAUTH_CLIENT_JSON_PATH env var is not set');
  }
  const creds = readJsonFile<OAuthClientJson>(clientJsonPath);
  const source = creds.installed ?? creds.web;
  if (!source) {
    throw new Error('Invalid OAuth client JSON — expected "installed" or "web" key');
  }
  return {
    clientId: source.client_id,
    clientSecret: source.client_secret,
    redirectUri: source.redirect_uris?.[0] ?? 'urn:ietf:wg:oauth:2.0:oob',
  };
}

function resolveToken(): StoredToken {
  // Check env var first, then common gog locations
  const tokenPath = process.env.GOOGLE_OAUTH_TOKEN_PATH;
  if (tokenPath) {
    return readJsonFile<StoredToken>(tokenPath);
  }

  // Try reading gog's stored token
  const home = process.env.HOME ?? '';
  const candidates = [
    path.join(home, '.config', 'gogcli', 'token.json'),
    path.join(home, '.config', 'gogcli', 'oauth_token.json'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return readJsonFile<StoredToken>(candidate);
    }
  }

  throw new Error(
    'Gmail OAuth token not found. Set GOOGLE_OAUTH_TOKEN_PATH or run: npx tsx scripts/setup-google.ts'
  );
}

export function getGmailClient(): gmail_v1.Gmail {
  if (gmailClient) return gmailClient;

  const { clientId, clientSecret, redirectUri } = resolveOAuthCredentials();
  const token = resolveToken();

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    token_type: token.token_type ?? 'Bearer',
    expiry_date: token.expiry_date,
  });

  gmailClient = google.gmail({ version: 'v1', auth: oauth2Client });
  return gmailClient;
}

export function resetGmailClient(): void {
  gmailClient = null;
}
