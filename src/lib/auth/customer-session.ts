import { cookies } from 'next/headers';
import { getRuntimeEnvironment } from '../db';

export const CUSTOMER_SESSION_COOKIE = 'cafeos_customer_session';

export interface CustomerSession {
  userId: string;
  email: string;
  fullName: string;
  cafeId: string;
  exp: number;
}

function getSecret(): string {
  const env = getRuntimeEnvironment() as Record<string, unknown>;
  const secret = (env.SESSION_SECRET as string | undefined) ?? process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  return 'cafeos-local-dev-customer-session-secret-key';
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

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    key,
    256
  );
  return `${toBase64Url(salt)}:${toBase64Url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltStr, hashStr] = stored.split(':');
  if (!saltStr || !hashStr) return false;
  const salt = fromBase64Url(saltStr);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations: 100_000, hash: 'SHA-256' },
    key,
    256
  );
  const candidate = toBase64Url(new Uint8Array(bits));
  if (candidate.length !== hashStr.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) {
    diff |= candidate.charCodeAt(i) ^ hashStr.charCodeAt(i);
  }
  return diff === 0;
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

export async function createCustomerSessionToken(
  payload: Omit<CustomerSession, 'exp'>,
  ttlSeconds = 60 * 60 * 24 * 14
): Promise<string> {
  const full: CustomerSession = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(full)));
  const sig = await signData(encoded);
  return `${encoded}.${sig}`;
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = await signData(encoded);
  if (sig !== expectedSig) return null;

  try {
    const json = new TextDecoder().decode(fromBase64Url(encoded));
    const parsed = JSON.parse(json) as CustomerSession;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

