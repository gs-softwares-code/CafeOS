import { cookies } from 'next/headers';
import { getRuntimeEnvironment } from '../db';

export const STAFF_SESSION_COOKIE = 'cafeos_staff_session';

export type StaffRole = 'owner' | 'manager' | 'staff' | 'reception';

export interface StaffSession {
  userId: string;
  email: string;
  fullName: string;
  cafeId: string;
  role: StaffRole;
  exp: number;
}

function getSecret(): string {
  const env = getRuntimeEnvironment() as Record<string, unknown>;
  const secret = (env.SESSION_SECRET as string | undefined) ?? process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  return 'cafeos-local-dev-staff-session-secret-key';
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function signData(encoded: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded));
  return toBase64Url(new Uint8Array(sig));
}

export async function createStaffSessionToken(
  payload: Omit<StaffSession, 'exp'>,
  ttlSeconds = 60 * 60 * 12
): Promise<string> {
  const full: StaffSession = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(full)));
  const sig = await signData(encoded);
  return `${encoded}.${sig}`;
}

export async function getStaffSession(): Promise<StaffSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE)?.value;
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = await signData(encoded);
  if (sig !== expectedSig) return null;

  try {
    const json = new TextDecoder().decode(fromBase64Url(encoded));
    const parsed = JSON.parse(json) as StaffSession;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

